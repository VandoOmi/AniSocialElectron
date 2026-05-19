import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const PREVIEW_FILENAME = 'last-page.png';

/** Returns the full path to the saved preview screenshot */
export function getPreviewPath(): string {
  return path.join(app.getPath('userData'), PREVIEW_FILENAME);
}

/** Check if a preview screenshot exists */
export function hasPreview(): boolean {
  return fs.existsSync(getPreviewPath());
}

/** Capture the current page and save as preview for next launch */
export async function capturePreview(win: BrowserWindow): Promise<void> {
  try {
    if (win.isDestroyed() || !win.webContents) return;

    const image = await win.webContents.capturePage();
    if (image.isEmpty()) return;

    fs.writeFileSync(getPreviewPath(), image.toPNG());
  } catch {
    // Non-critical — silently ignore capture failures
  }
}
