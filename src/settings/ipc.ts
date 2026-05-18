import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../types/ipc';
import type { SettingsKey, SettingsSchema } from '../types/settings';
import { getSettings, setSetting } from './store';
import { getActionsWithAccelerators } from '../keybinds';

export function initSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    return getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    <K extends SettingsKey>(_event: unknown, payload: { key: K; value: SettingsSchema[K] }) => {
      setSetting(payload.key, payload.value);
      return { key: payload.key, value: payload.value };
    },
  );

  ipcMain.handle(IPC_CHANNELS.KEYBINDS_GET_ACTIONS, () => {
    return getActionsWithAccelerators();
  });

  ipcMain.handle(IPC_CHANNELS.PICK_SOUND_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Benachrichtigungston auswählen',
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'm4a'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
