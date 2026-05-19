import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import * as path from 'path';

import { APP_CONFIG, TRAY_ICONS, type Platform } from './types/config';

// --- State ---

let tray: Tray | null = null;
let originalTrayIcon: NativeImage | null = null;

// --- Public API ---

export interface TrayCallbacks {
  onShow: () => void;
  onQuit: () => void;
}

export function createTray(callbacks: TrayCallbacks): void {
  const iconPath = path.join(__dirname, '..', 'assets', getTrayIconFile());
  const trayIcon = nativeImage.createFromPath(iconPath);

  if (trayIcon.isEmpty()) {
    console.error(`Tray icon not found or invalid: ${iconPath}`);
    return;
  }

  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  originalTrayIcon = trayIcon;
  tray.setToolTip(APP_CONFIG.APP_NAME);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Anzeigen', click: callbacks.onShow },
    { type: 'separator' },
    { label: 'Beenden', click: callbacks.onQuit },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', callbacks.onShow);
}

export function updateUnreadBadge(
  mainWindow: Electron.BrowserWindow | null,
  count: number,
): void {
  updateTrayTooltip(count);
  updatePlatformBadge(mainWindow, count);
  updateTrayIcon(count);
}

// --- Private Helpers ---

function getTrayIconFile(): string {
  const platform = process.platform as Platform;
  return TRAY_ICONS[platform] ?? TRAY_ICONS.linux;
}

function updateTrayTooltip(count: number): void {
  if (!tray) return;
  tray.setToolTip(
    count > 0 ? `${APP_CONFIG.APP_NAME} (${count} ungelesen)` : APP_CONFIG.APP_NAME,
  );
}

function updatePlatformBadge(mainWindow: Electron.BrowserWindow | null, count: number): void {
  if (process.platform === 'darwin') {
    app.dock?.setBadge(count > 0 ? String(count) : '');
  } else if (process.platform === 'win32') {
    if (mainWindow) {
      mainWindow.setOverlayIcon(
        count > 0 ? createBadgeIcon(count) : null,
        count > 0 ? `${count} ungelesene Nachrichten` : '',
      );
    }
  } else {
    app.setBadgeCount(count);
  }
}

function updateTrayIcon(count: number): void {
  if (!tray || process.platform !== 'linux') return;

  if (count > 0) {
    tray.setImage(createTrayBadgeIcon(count));
  } else if (originalTrayIcon) {
    tray.setImage(originalTrayIcon);
  }
}

function createBadgeIcon(count: number): NativeImage {
  const text = formatBadgeText(count);
  const svg = `
    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="8" fill="#e53935"/>
      <text x="8" y="12" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="white">${text}</text>
    </svg>`;
  return nativeImage.createFromDataURL(svgToDataUrl(svg));
}

function createTrayBadgeIcon(count: number): NativeImage {
  const text = formatBadgeText(count);
  const svg = `
    <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="22" fill="none"/>
      <circle cx="15" cy="7" r="7" fill="#e53935"/>
      <text x="15" y="10" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" font-weight="bold" fill="white">${text}</text>
    </svg>`;
  return nativeImage.createFromDataURL(svgToDataUrl(svg));
}

function formatBadgeText(count: number): string {
  return count > APP_CONFIG.MAX_BADGE_COUNT ? `${APP_CONFIG.MAX_BADGE_COUNT}+` : String(count);
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
