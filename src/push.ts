import { app, net, session } from 'electron';
import { getSetting } from './settings/store';

const API_BASE = 'https://api.anisocial.de/api/v1';

interface AniNotification {
  _id: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  fromUser?: {
    username: string;
    displayName: string;
    profilePicture?: string;
  };
  message?: string;
  link?: string;
}

interface NotificationsResponse {
  success: boolean;
  data: AniNotification[];
}

type OnNotificationCallback = (title: string, body: string, count: number) => void;

let onNotification: OnNotificationCallback | null = null;
const seenIds: Set<string> = new Set();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let isFirstPoll = true;
let consecutiveFailures = 0;
const MAX_BACKOFF_MULTIPLIER = 8;

function getUnreadCount(notifications: AniNotification[]): number {
  return notifications.filter((n) => !n.isRead).length;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const allCookies = await session.defaultSession.cookies.get({ domain: '.anisocial.de' });
    const tokenCookie = allCookies.find((c) => c.name === 'token');
    if (tokenCookie) return tokenCookie.value;

    // Fallback: try without leading dot
    const allCookies2 = await session.defaultSession.cookies.get({ domain: 'anisocial.de' });
    const tokenCookie2 = allCookies2.find((c) => c.name === 'token');
    if (tokenCookie2) return tokenCookie2.value;
  } catch (e) {
    console.error('[Notifications] Failed to get auth token:', e);
  }
  return null;
}

async function fetchJson(url: string, token: string): Promise<string> {
  const response = await net.fetch(url, {
    headers: {
      Cookie: `token=${token}`,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.substring(0, 200)}`);
  }

  return response.text();
}

async function pollNotifications(): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[Notifications] No auth token yet, skipping poll');
    return;
  }

  try {
    const raw = await fetchJson(`${API_BASE}/notifications`, token);
    const response: NotificationsResponse = JSON.parse(raw);

    if (!response.success || !Array.isArray(response.data)) return;

    const notifications = response.data;

    if (isFirstPoll) {
      // First poll: just record existing IDs, don't notify
      for (const n of notifications) {
        seenIds.add(n._id);
      }
      isFirstPoll = false;

      // Count unread for initial badge
      const unreadCount = getUnreadCount(notifications);
      if (unreadCount > 0 && onNotification) {
        // Only update badge, don't show notification on first poll
        onNotification('', '', unreadCount);
      }
      console.log(
        `[Notifications] Initial poll: ${notifications.length} total, ${unreadCount} unread`,
      );
      return;
    }

    // Check for new notifications
    const newNotifications: AniNotification[] = [];
    for (const n of notifications) {
      if (seenIds.has(n._id)) continue;
      seenIds.add(n._id);

      if (!n.isRead) {
        newNotifications.push(n);
      }
    }

    const unreadCount = getUnreadCount(notifications);

    if (newNotifications.length > 0 && onNotification) {
      if (newNotifications.length === 1) {
        const n = newNotifications[0];
        const fromName = n.fromUser?.displayName || n.fromUser?.username || 'Jemand';
        const body = `${fromName} ${n.message || 'hat eine Aktion ausgeführt'}`;
        onNotification('AniSocial', body, unreadCount);
      } else {
        const body = `${newNotifications.length} neue Benachrichtigungen`;
        onNotification('AniSocial', body, unreadCount);
      }
    } else if (onNotification) {
      // No new notifications — still sync the badge (e.g. user read on another device)
      onNotification('', '', unreadCount);
    }

    consecutiveFailures = 0;
  } catch (e) {
    consecutiveFailures++;
    console.error('[Notifications] Poll failed:', e);
  } finally {
    scheduleNextPoll();
  }
}

function getNextInterval(): number {
  const baseMs = getSetting('notifications.pollingIntervalSec') * 1000;
  if (consecutiveFailures === 0) return baseMs;
  const multiplier = Math.min(Math.pow(2, consecutiveFailures), MAX_BACKOFF_MULTIPLIER);
  return baseMs * multiplier;
}

function scheduleNextPoll(): void {
  if (!pollTimer) return; // polling was stopped
  const interval = getNextInterval();
  pollTimer = setTimeout(() => {
    pollNotifications();
  }, interval);
}

function startPolling(): void {
  if (pollTimer) return;

  // Use a non-null sentinel so scheduleNextPoll knows polling is active
  pollTimer = setTimeout(() => {
    pollNotifications();
  }, 5000);

  const intervalMs = getSetting('notifications.pollingIntervalSec') * 1000;
  console.log(`[Notifications] Polling started (every ${intervalMs / 1000}s)`);
}

function stopPolling(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export function restartPolling(): void {
  stopPolling();
  startPolling();
}

export function initNotifications(callback: OnNotificationCallback): void {
  onNotification = (title, body, count) => {
    // Respect notifications.enabled setting (always allow badge-only updates)
    if (title && !getSetting('notifications.enabled')) {
      // Still update badge even if notifications are disabled
      callback('', '', count);
      return;
    }
    callback(title, body, count);
  };
  startPolling();

  app.on('will-quit', () => {
    stopPolling();
  });
}
