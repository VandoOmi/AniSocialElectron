import {
  BrowserWindow,
  Menu,
  Notification,
  clipboard,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import * as path from 'path';

import { APP_CONFIG } from './types/config';
import { getEffectiveAccelerator } from './keybinds';
import { getSetting, setSetting } from './settings/store';

// --- Context Menu ---

export function showContextMenu(
  mainWindow: BrowserWindow,
  params: Electron.ContextMenuParams,
): void {
  const menuItems: MenuItemConstructorOptions[] = [];

  if (params.isEditable) {
    menuItems.push(
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    );
  } else if (params.selectionText) {
    menuItems.push({ role: 'copy' }, { role: 'selectAll' });
  }

  if (params.linkURL) {
    menuItems.push(
      { type: 'separator' },
      { label: 'Link im Browser öffnen', click: () => shell.openExternal(params.linkURL) },
      { label: 'Link kopieren', click: () => clipboard.writeText(params.linkURL) },
    );
  }

  if (params.mediaType === 'image') {
    menuItems.push(
      { type: 'separator' },
      { label: 'Bild im Browser öffnen', click: () => shell.openExternal(params.srcURL) },
    );
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Zurück',
      enabled: mainWindow.webContents.navigationHistory.canGoBack(),
      click: () => mainWindow.webContents.navigationHistory.goBack(),
    },
    {
      label: 'Vor',
      enabled: mainWindow.webContents.navigationHistory.canGoForward(),
      click: () => mainWindow.webContents.navigationHistory.goForward(),
    },
    { type: 'separator' },
    { label: 'Neu laden', click: () => mainWindow.webContents.reload() },
  );

  Menu.buildFromTemplate(menuItems).popup();
}

// --- Application Menu ---

export function buildApplicationMenu(mainWindow: BrowserWindow | null): void {
  const template: MenuItemConstructorOptions[] = [
    { label: 'Navigation', submenu: buildNavigationSubmenu(mainWindow) },
    { label: 'Bearbeiten', submenu: buildEditSubmenu() },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function buildNavigationSubmenu(mainWindow: BrowserWindow | null): MenuItemConstructorOptions[] {
  const quickNavItems = buildQuickNavItems(mainWindow);

  return [
    {
      label: 'Neu laden',
      accelerator: getEffectiveAccelerator('nav.reload'),
      click: () => mainWindow?.webContents.reload(),
    },
    {
      label: 'Hard Reload',
      accelerator: getEffectiveAccelerator('nav.hardReload'),
      click: () => mainWindow?.webContents.reloadIgnoringCache(),
    },
    {
      label: 'Zurück',
      accelerator: getEffectiveAccelerator('nav.back'),
      click: () => mainWindow?.webContents.navigationHistory.goBack(),
    },
    {
      label: 'Vor',
      accelerator: getEffectiveAccelerator('nav.forward'),
      click: () => mainWindow?.webContents.navigationHistory.goForward(),
    },
    {
      label: 'Startseite',
      accelerator: getEffectiveAccelerator('nav.home'),
      click: () => mainWindow?.loadURL(APP_CONFIG.TARGET_URL),
    },
    { type: 'separator' },
    {
      label: 'Vollbild',
      accelerator: getEffectiveAccelerator('nav.fullscreen'),
      click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()),
    },
    {
      label: 'DevTools',
      accelerator: getEffectiveAccelerator('nav.devtools'),
      click: () => mainWindow?.webContents.toggleDevTools(),
    },
    { type: 'separator' },
    {
      label: 'Zoom +',
      accelerator: getEffectiveAccelerator('nav.zoomIn'),
      click: () => {
        const zoom = mainWindow?.webContents.getZoomLevel() ?? 0;
        mainWindow?.webContents.setZoomLevel(zoom + 0.5);
      },
    },
    {
      label: 'Zoom -',
      accelerator: getEffectiveAccelerator('nav.zoomOut'),
      click: () => {
        const zoom = mainWindow?.webContents.getZoomLevel() ?? 0;
        mainWindow?.webContents.setZoomLevel(zoom - 0.5);
      },
    },
    {
      label: 'Zoom zurücksetzen',
      accelerator: getEffectiveAccelerator('nav.zoomReset'),
      click: () => mainWindow?.webContents.setZoomLevel(0),
    },
    { type: 'separator' },
    ...(quickNavItems.length > 0 ? [...quickNavItems, { type: 'separator' as const }] : []),
    { role: 'quit' as const, label: 'Beenden' },
  ];
}

function buildEditSubmenu(): MenuItemConstructorOptions[] {
  return [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'selectAll' },
  ];
}

function buildQuickNavItems(mainWindow: BrowserWindow | null): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [];
  const slots = getSetting('quicknav.slots');

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const accelerator = getEffectiveAccelerator(`quicknav.slot${i + 1}`);

    if (slot.path) {
      items.push({
        label: slot.label || `Slot ${i + 1}: ${slot.path}`,
        accelerator,
        click: () => mainWindow?.loadURL(APP_CONFIG.TARGET_URL + slot.path),
      });
    } else {
      items.push({
        label: `Slot ${i + 1}: (aktuelle Seite zuweisen)`,
        accelerator,
        click: () => assignQuickNavSlot(mainWindow, i),
      });
    }
  }

  return items;
}

function assignQuickNavSlot(mainWindow: BrowserWindow | null, index: number): void {
  if (!mainWindow) return;

  try {
    const currentUrl = mainWindow.webContents.getURL();
    const pagePath = new URL(currentUrl).pathname;

    const slots = [...getSetting('quicknav.slots')];
    slots[index] = { path: pagePath, label: '' };
    setSetting('quicknav.slots', slots);

    new Notification({
      title: APP_CONFIG.APP_NAME,
      body: `„${pagePath}" wurde als Quick-Nav Slot ${index + 1} gespeichert.`,
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      silent: true,
    }).show();
  } catch {
    /* ignore invalid URLs */
  }
}
