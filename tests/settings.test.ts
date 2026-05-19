import { describe, it, expect } from 'vitest';
import { SETTINGS_DEFAULTS } from '../src/types/settings';

describe('SETTINGS_DEFAULTS', () => {
  it('should have notifications enabled by default', () => {
    expect(SETTINGS_DEFAULTS['notifications.enabled']).toBe(true);
  });

  it('should have a polling interval of 30 seconds', () => {
    expect(SETTINGS_DEFAULTS['notifications.pollingIntervalSec']).toBe(30);
  });

  it('should have volume at 80%', () => {
    expect(SETTINGS_DEFAULTS['notifications.volume']).toBe(80);
  });

  it('should have hardware acceleration enabled', () => {
    expect(SETTINGS_DEFAULTS['general.hardwareAcceleration']).toBe(true);
  });

  it('should have empty keybind overrides', () => {
    expect(SETTINGS_DEFAULTS['keybinds.overrides']).toEqual({});
  });

  it('should have 5 empty quicknav slots', () => {
    const slots = SETTINGS_DEFAULTS['quicknav.slots'];
    expect(slots).toHaveLength(5);
    slots.forEach((slot) => {
      expect(slot.path).toBe('');
      expect(slot.label).toBe('');
    });
  });
});
