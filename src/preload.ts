import { contextBridge, ipcRenderer } from 'electron';

// IPC channel names inlined (sandboxed preloads can't require relative modules)
const IPC_CHANNELS = {
  SHOW_NOTIFICATION: 'show-notification',
  UPDATE_BADGE: 'update-badge',
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_SET: 'settings:set',
  KEYBINDS_GET_ACTIONS: 'keybinds:get-actions',
  KEYBINDS_RECORDING_START: 'keybinds:recording-start',
  KEYBINDS_RECORDING_STOP: 'keybinds:recording-stop',
  PICK_SOUND_FILE: 'settings:pick-sound-file',
  RETRY_LOAD: 'app:retry-load',
  PLAY_NOTIFICATION_SOUND: 'app:play-notification-sound',
} as const;

// Expose a type-safe API to the renderer via contextBridge.
// This replaces the insecure postMessage('*') pattern with a proper IPC bridge.
contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (payload: { title: string; body: string; icon?: string }) => {
    ipcRenderer.send(IPC_CHANNELS.SHOW_NOTIFICATION, payload);
    ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE);
  },
  getSettings: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  setSetting: (key: string, value: unknown): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, { key, value }),
  getKeybindActions: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.KEYBINDS_GET_ACTIONS),
  startKeybindRecording: () => ipcRenderer.send(IPC_CHANNELS.KEYBINDS_RECORDING_START),
  stopKeybindRecording: () => ipcRenderer.send(IPC_CHANNELS.KEYBINDS_RECORDING_STOP),
  pickSoundFile: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.PICK_SOUND_FILE),
  retryLoad: () => ipcRenderer.send(IPC_CHANNELS.RETRY_LOAD),
  onKeybindCaptured: (callback: (accelerator: string) => void) => {
    ipcRenderer.on('keybind:captured', (_event, accelerator: string) => {
      callback(accelerator);
    });
  },
});

// Listen for sound playback requests from the main process.
// The preload has access to Web APIs (Audio) in the renderer process.
ipcRenderer.on('play-notification-sound', (_event, data: { url: string; volume: number }) => {
  const audio = new Audio(data.url);
  audio.volume = data.volume;
  audio.play().catch(() => {});
});
