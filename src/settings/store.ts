import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  SETTINGS_DEFAULTS,
  type QuickNavSlot,
  type SettingsKey,
  type SettingsSchema,
} from '../types/settings';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// In-memory cache — read once from disk, write-through on changes
let cache: SettingsSchema | null = null;

/** Migrate old per-slot quicknav keys to the new array format */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateQuickNav(raw: any): void {
  if (raw['quicknav.slots']) return; // already migrated
  const slots: QuickNavSlot[] = [];
  for (let i = 1; i <= 5; i++) {
    slots.push({
      path: raw[`quicknav.slot${i}.path`] || '',
      label: raw[`quicknav.slot${i}.label`] || '',
    });
    delete raw[`quicknav.slot${i}.path`];
    delete raw[`quicknav.slot${i}.label`];
  }
  raw['quicknav.slots'] = slots;
}

function loadCache(): SettingsSchema {
  if (cache) return cache;
  try {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    const raw = JSON.parse(data);
    migrateQuickNav(raw);
    cache = { ...SETTINGS_DEFAULTS, ...raw };
  } catch {
    cache = { ...SETTINGS_DEFAULTS };
  }
  return cache!;
}

function persist(): void {
  if (!cache) return;
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(cache, null, 2), 'utf-8');
}

type ChangeCallback<K extends SettingsKey> = (
  newValue: SettingsSchema[K],
  oldValue: SettingsSchema[K],
) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Map<SettingsKey, Set<ChangeCallback<any>>>();

export function getSettings(): SettingsSchema {
  return { ...loadCache() };
}

export function getSetting<K extends SettingsKey>(key: K): SettingsSchema[K] {
  return loadCache()[key];
}

export function setSetting<K extends SettingsKey>(key: K, value: SettingsSchema[K]): void {
  const store = loadCache();
  const oldValue = store[key];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (store as any)[key] = value;
  persist();
  const callbacks = listeners.get(key);
  if (callbacks) {
    for (const cb of callbacks) {
      cb(value, oldValue);
    }
  }
}

export function onSettingChanged<K extends SettingsKey>(key: K, callback: ChangeCallback<K>): void {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(callback);
}
