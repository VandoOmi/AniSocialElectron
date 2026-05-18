import { Client } from 'discord-rpc';
import { APP_CONFIG } from './types/config';
import { getSetting } from './settings/store';

let rpcClient: Client | null = null;
let connected = false;
let currentPage = '/';
const startTimestamp = Date.now();

function getPageDetails(pagePath: string): { details: string; state: string } {
  const path = pagePath.replace(/\?.*$/, '').replace(/#.*$/, '');

  if (path === '/' || path === '') {
    return { details: 'Im Feed', state: 'Startseite' };
  }
  if (path.startsWith('/profile/')) {
    const username = path.split('/')[2] || '';
    return { details: 'Schaut ein Profil an', state: `@${username}` };
  }
  if (path.startsWith('/posts/')) {
    return { details: 'Liest einen Post', state: 'Post-Ansicht' };
  }
  if (path === '/notifications') {
    return { details: 'Benachrichtigungen', state: 'Benachrichtigungen' };
  }
  if (path === '/messages' || path.startsWith('/messages/')) {
    return { details: 'Nachrichten', state: 'Chat' };
  }
  if (path === '/discover') {
    return { details: 'Entdecken', state: 'Neue Inhalte entdecken' };
  }
  if (path === '/settings') {
    return { details: 'Einstellungen', state: 'Einstellungen' };
  }
  return { details: 'Unterwegs auf AniSocial', state: 'Browsing' };
}

async function connectRPC(): Promise<void> {
  if (rpcClient || !getSetting('general.discordRPC')) return;

  rpcClient = new Client({ transport: 'ipc' });

  rpcClient.on('ready', () => {
    connected = true;
    updatePresence(currentPage);
  });

  rpcClient.on('disconnected', () => {
    connected = false;
    rpcClient = null;
  });

  try {
    await rpcClient.login({ clientId: APP_CONFIG.DISCORD_CLIENT_ID });
  } catch {
    // Discord not running or client ID invalid — silently fail
    rpcClient = null;
  }
}

function updatePresence(pagePath: string): void {
  currentPage = pagePath;
  if (!rpcClient || !connected) return;

  const { details, state } = getPageDetails(pagePath);

  rpcClient
    .setActivity({
      details,
      state,
      startTimestamp,
      largeImageKey: 'anisocial_logo',
      largeImageText: 'AniSocial Desktop',
      buttons: [{ label: 'AniSocial besuchen', url: APP_CONFIG.TARGET_URL }],
    })
    .catch(() => {});
}

function disconnectRPC(): void {
  if (rpcClient) {
    rpcClient.clearActivity().catch(() => {});
    rpcClient.destroy().catch(() => {});
    rpcClient = null;
    connected = false;
  }
}

export function initDiscordRPC(): void {
  if (getSetting('general.discordRPC')) {
    connectRPC();
  }
}

export function updateDiscordPresence(pagePath: string): void {
  if (!getSetting('general.discordRPC')) return;
  updatePresence(pagePath);
}

export function setDiscordRPCEnabled(enabled: boolean): void {
  if (enabled) {
    connectRPC();
  } else {
    disconnectRPC();
  }
}
