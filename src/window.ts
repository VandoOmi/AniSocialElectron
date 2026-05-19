import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import windowStateKeeper from 'electron-window-state';

import { APP_CONFIG } from './types/config';
import { getSetting } from './settings/store';
import { getSettingsInjectionScript } from './settings-inject';
import { getNotificationMockScript } from './inject/notification-mock';
import { getPushMockScript } from './inject/push-mock';
import { showContextMenu } from './menu';

// --- URL Safety ---

const TARGET_ORIGIN = new URL(APP_CONFIG.TARGET_URL).origin;

function isInternalUrl(url: string): boolean {
  try {
    return new URL(url).origin === TARGET_ORIGIN;
  } catch {
    return false;
  }
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// --- Public API ---

export interface WindowCallbacks {
  onClose: (event: Electron.Event) => void;
  onClosed: () => void;
  onFocus: () => void;
  onBadgeUpdate: (count: number) => void;
}

export function createMainWindow(callbacks: WindowCallbacks): BrowserWindow {
  const windowState = windowStateKeeper({
    defaultWidth: APP_CONFIG.WINDOW.DEFAULT_WIDTH,
    defaultHeight: APP_CONFIG.WINDOW.DEFAULT_HEIGHT,
  });

  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: APP_CONFIG.WINDOW.MIN_WIDTH,
    minHeight: APP_CONFIG.WINDOW.MIN_HEIGHT,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  windowState.manage(win);
  win.loadURL(APP_CONFIG.TARGET_URL);

  setupPermissions(win);
  setupScriptInjection(win);
  setupNavigation(win);
  setupContextMenu(win);
  setupWindowEvents(win, callbacks);

  return win;
}

// --- Private Setup Functions ---

function setupPermissions(win: BrowserWindow): void {
  const allowedPermissions = ['notifications', 'push'];

  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });

  win.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return allowedPermissions.includes(permission);
  });
}

function setupScriptInjection(win: BrowserWindow): void {
  const scripts = [
    getNotificationMockScript,
    getPushMockScript,
    () => getSettingsInjectionScript(app.getVersion()),
  ];

  // did-start-navigation: inject early (may fail if context isn't ready)
  win.webContents.on('did-start-navigation', () => {
    for (const getScript of scripts) {
      win.webContents.executeJavaScript(getScript()).catch(() => {});
    }
  });

  // dom-ready: reliable fallback injection
  win.webContents.on('dom-ready', () => {
    for (const getScript of scripts) {
      win.webContents.executeJavaScript(getScript()).catch((e) => {
        console.error('[Inject] Script injection failed on dom-ready:', e);
      });
    }

    applyZoomLevel(win);
  });
}

function setupNavigation(win: BrowserWindow): void {
  // Show window when page is ready to avoid white flash
  win.once('ready-to-show', () => win.show());

  // Show offline page when the site can't be reached
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Aborted
    if (!isInternalUrl(validatedURL)) return;

    const offlinePath = path.join(__dirname, '..', 'assets', 'offline.html');
    win.loadFile(offlinePath, {
      query: { code: String(errorCode), desc: errorDescription },
    });
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url) && isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
    }
  });
}

function setupContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    showContextMenu(win, params);
  });
}

function setupWindowEvents(win: BrowserWindow, callbacks: WindowCallbacks): void {
  win.on('close', callbacks.onClose);
  win.on('closed', callbacks.onClosed);
  win.on('focus', callbacks.onFocus);

  // Update title and extract unread count
  win.webContents.on('page-title-updated', (_event, title) => {
    win.setTitle(`${title} — ${APP_CONFIG.APP_NAME}`);

    const match = title.match(/^\((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;
    callbacks.onBadgeUpdate(count);
  });
}

// --- Keybind Recording ---

let isRecordingKeybind = false;

export function startKeybindRecording(win: BrowserWindow): void {
  if (isRecordingKeybind) return;
  isRecordingKeybind = true;

  win.webContents.on('before-input-event', handleKeybindInput);
}

export function stopKeybindRecording(win: BrowserWindow): void {
  isRecordingKeybind = false;

  win.webContents.removeListener('before-input-event', handleKeybindInput);
}

function handleKeybindInput(event: Electron.Event, input: Electron.Input): void {
  if (!isRecordingKeybind) return;
  if (input.type !== 'keyDown') return;

  const key = input.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;
  if (key === 'Escape' || key === 'Delete' || key === 'Backspace') return;

  const parts: string[] = [];
  if (input.control || input.meta) parts.push('CmdOrCtrl');
  if (input.alt) parts.push('Alt');
  if (input.shift) parts.push('Shift');

  const mappedKey = mapKeyToAccelerator(key);

  const isFKey = /^F\d{1,2}$/.test(mappedKey);
  if (!isFKey && parts.length === 0) return;

  event.preventDefault();
  parts.push(mappedKey);

  const accelerator = parts.join('+');
  const webContents = (event as { sender?: Electron.WebContents }).sender;
  webContents?.send('keybind:captured', accelerator);
}

function mapKeyToAccelerator(key: string): string {
  const keyMap: Record<string, string> = {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ' ': 'Space',
    Enter: 'Return',
    '+': 'Plus',
    Tab: 'Tab',
  };

  if (keyMap[key]) return keyMap[key];
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// --- Helpers ---

function applyZoomLevel(win: BrowserWindow): void {
  const zoomLevel = getSetting('appearance.zoomLevel');
  if (zoomLevel !== 0) {
    win.webContents.setZoomLevel(zoomLevel);
  }
}
