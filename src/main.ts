import { app, BrowserWindow, ipcMain, Menu, Notification } from 'electron';
import * as path from 'path';

import { APP_CONFIG } from './types/config';
import { IPC_CHANNELS, type NotificationPayload } from './types/ipc';
import { initAutoUpdater } from './updater';
import { initNotifications, restartPolling } from './push';
import { initSettingsIpc } from './settings/ipc';
import { flushSettings, getSetting, onSettingChanged } from './settings/store';
import { createMainWindow, startKeybindRecording, stopKeybindRecording } from './window';
import { createTray, updateUnreadBadge } from './tray';
import { buildApplicationMenu } from './menu';

// --- Single Instance Lock ---

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });
}

// --- State ---

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let unreadCount = 0;

// --- Autostart Helper ---

function getLoginItemSettings(openAtLogin: boolean) {
  const settings: Parameters<typeof app.setLoginItemSettings>[0] = {
    openAtLogin,
    name: APP_CONFIG.APP_NAME,
  };
  if (process.platform === 'linux' && process.env.APPIMAGE) {
    settings.path = process.env.APPIMAGE;
  }
  return settings;
}

// --- Notification Sound ---

function playNotificationSound(): void {
  if (!getSetting('notifications.sound')) return;

  const customSound = getSetting('notifications.customSound');
  const soundFile = customSound
    ? customSound.replace(/\\/g, '/')
    : path.join(__dirname, '..', 'assets', 'notification.wav').replace(/\\/g, '/');
  const volume = Math.max(0, Math.min(1, getSetting('notifications.volume') / 100));

  mainWindow?.webContents.send('play-notification-sound', {
    url: 'file:///' + soundFile,
    volume,
  });
}

// --- Window Lifecycle ---

function initWindow(): void {
  mainWindow = createMainWindow({
    onClose: (event) => {
      if (!isQuitting && getSetting('general.closeToTray')) {
        event.preventDefault();
        mainWindow?.hide();
      }
    },
    onClosed: () => {
      mainWindow = null;
    },
    onFocus: () => {
      unreadCount = 0;
      updateUnreadBadge(mainWindow, 0);
    },
    onBadgeUpdate: (count) => {
      unreadCount = count;
      updateUnreadBadge(mainWindow, unreadCount);
    },
  });
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    initWindow();
    return;
  }
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// --- IPC Handlers ---

function registerIpcHandlers(): void {
  ipcMain.on(IPC_CHANNELS.SHOW_NOTIFICATION, (_event, payload: NotificationPayload) => {
    if (!getSetting('notifications.enabled')) return;

    const notification = new Notification({
      title: payload.title || APP_CONFIG.APP_NAME,
      body: payload.body || '',
      icon: payload.icon || path.join(__dirname, '..', 'assets', 'icon.png'),
      silent: true,
    });

    notification.on('click', () => showWindow());
    notification.show();
    playNotificationSound();
  });

  ipcMain.on(IPC_CHANNELS.UPDATE_BADGE, () => {
    if (mainWindow && !mainWindow.isFocused()) {
      unreadCount++;
      updateUnreadBadge(mainWindow, unreadCount);
    }
  });

  ipcMain.on(IPC_CHANNELS.KEYBINDS_RECORDING_START, () => {
    if (mainWindow) startKeybindRecording(mainWindow);
    Menu.setApplicationMenu(null);
  });

  ipcMain.on(IPC_CHANNELS.KEYBINDS_RECORDING_STOP, () => {
    if (mainWindow) stopKeybindRecording(mainWindow);
    buildApplicationMenu(mainWindow);
  });

  ipcMain.on(IPC_CHANNELS.RETRY_LOAD, () => {
    mainWindow?.loadURL(APP_CONFIG.TARGET_URL);
  });
}

// --- Settings Reactions ---

function registerSettingsListeners(): void {
  onSettingChanged('general.autoStart', (value) => {
    app.setLoginItemSettings(getLoginItemSettings(value));
  });

  onSettingChanged('appearance.zoomLevel', (value) => {
    mainWindow?.webContents.setZoomLevel(value);
  });

  onSettingChanged('notifications.pollingIntervalSec', () => {
    restartPolling();
  });

  onSettingChanged('keybinds.overrides', () => buildApplicationMenu(mainWindow));

  type SlotPathKey = `quicknav.slot${1 | 2 | 3 | 4 | 5}.path`;
  type SlotLabelKey = `quicknav.slot${1 | 2 | 3 | 4 | 5}.label`;
  for (let i = 1; i <= 5; i++) {
    onSettingChanged(`quicknav.slot${i}.path` as SlotPathKey, () =>
      buildApplicationMenu(mainWindow),
    );
    onSettingChanged(`quicknav.slot${i}.label` as SlotLabelKey, () =>
      buildApplicationMenu(mainWindow),
    );
  }
}

// --- Notification Polling ---

function startNotificationPolling(): void {
  initNotifications((title, body, badgeCount) => {
    if (title) {
      const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        silent: true,
      });

      notification.on('click', () => showWindow());
      notification.show();
      playNotificationSound();
    }

    unreadCount = badgeCount;
    updateUnreadBadge(mainWindow, unreadCount);
  });
}

// --- App Lifecycle ---

app.on('before-quit', () => {
  isQuitting = true;
  flushSettings();
});

if (!getSetting('general.hardwareAcceleration')) {
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  initSettingsIpc();
  registerIpcHandlers();
  initWindow();
  createTray({
    onShow: showWindow,
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });
  buildApplicationMenu(mainWindow);
  initAutoUpdater();

  app.setLoginItemSettings(getLoginItemSettings(getSetting('general.autoStart')));
  registerSettingsListeners();
  startNotificationPolling();
});

app.on('browser-window-created', () => {
  buildApplicationMenu(mainWindow);
});

app.on('window-all-closed', () => {
  if (!getSetting('general.closeToTray')) {
    app.quit();
  }
});
