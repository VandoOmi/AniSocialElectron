/** A single Quick-Nav slot */
export interface QuickNavSlot {
  path: string;
  label: string;
}

/** Settings schema for the desktop app */
export interface SettingsSchema {
  'general.closeToTray': boolean;
  'general.autoStart': boolean;
  'general.hardwareAcceleration': boolean;
  'notifications.enabled': boolean;
  'notifications.sound': boolean;
  'notifications.volume': number;
  'notifications.customSound': string;
  'notifications.pollingIntervalSec': number;
  'appearance.zoomLevel': number;
  'keybinds.overrides': Record<string, string>;
  'quicknav.slots': QuickNavSlot[];
}

/** Default values for all settings */
export const SETTINGS_DEFAULTS: SettingsSchema = {
  'general.closeToTray': true,
  'general.autoStart': false,
  'general.hardwareAcceleration': true,
  'notifications.enabled': true,
  'notifications.sound': true,
  'notifications.volume': 80,
  'notifications.customSound': '',
  'notifications.pollingIntervalSec': 30,
  'appearance.zoomLevel': 0,
  'keybinds.overrides': {},
  'quicknav.slots': [
    { path: '', label: '' },
    { path: '', label: '' },
    { path: '', label: '' },
    { path: '', label: '' },
    { path: '', label: '' },
  ],
};

export type SettingsKey = keyof SettingsSchema;
