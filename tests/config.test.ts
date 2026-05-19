import { describe, it, expect } from 'vitest';
import { APP_CONFIG, TRAY_ICONS } from '../src/types/config';

describe('APP_CONFIG', () => {
  it('should have correct target URL', () => {
    expect(APP_CONFIG.TARGET_URL).toBe('https://anisocial.de');
  });

  it('should have valid window dimensions', () => {
    expect(APP_CONFIG.WINDOW.DEFAULT_WIDTH).toBeGreaterThan(0);
    expect(APP_CONFIG.WINDOW.DEFAULT_HEIGHT).toBeGreaterThan(0);
    expect(APP_CONFIG.WINDOW.MIN_WIDTH).toBeLessThanOrEqual(APP_CONFIG.WINDOW.DEFAULT_WIDTH);
    expect(APP_CONFIG.WINDOW.MIN_HEIGHT).toBeLessThanOrEqual(APP_CONFIG.WINDOW.DEFAULT_HEIGHT);
  });

  it('should have a 4-hour update interval', () => {
    expect(APP_CONFIG.UPDATE_INTERVAL_MS).toBe(4 * 60 * 60 * 1000);
  });
});

describe('TRAY_ICONS', () => {
  it('should have icons for all platforms', () => {
    expect(TRAY_ICONS.win32).toBe('icon.ico');
    expect(TRAY_ICONS.darwin).toBe('icon.png');
    expect(TRAY_ICONS.linux).toBe('icon.png');
  });
});
