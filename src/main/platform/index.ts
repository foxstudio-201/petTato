import { screen } from 'electron'
import * as win from './windows.js'
import * as mac from './macos.js'
import * as lin from './linux.js'

/**
 * Cross-platform integration facade. The rest of the app talks only to this
 * module; the OS-specific behaviour (autostart registration, naming) lives in
 * the per-platform files. Window/monitor geometry is handled uniformly through
 * Electron's `screen` module, which abstracts X11/Wayland/Win32/Cocoa.
 */
const impl = process.platform === 'win32' ? win : process.platform === 'darwin' ? mac : lin

export const platform = {
  setAutostart(enabled: boolean): void {
    try {
      impl.setAutostart(enabled)
    } catch {
      /* autostart is best-effort */
    }
  },
  getAutostart(): boolean {
    try {
      return impl.getAutostart()
    } catch {
      return false
    }
  },
  name(): string {
    return impl.platformName()
  },

  /** All displays with their work areas (excludes taskbars/docks/panels). */
  displays() {
    return screen.getAllDisplays().map((d, i) => ({
      index: i,
      id: d.id,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      primary: d.id === screen.getPrimaryDisplay().id
    }))
  },

  /** Work area (px) of a chosen monitor, falling back to the primary. */
  workAreaFor(monitorIndex: number) {
    const all = screen.getAllDisplays()
    const d = all[monitorIndex] ?? screen.getPrimaryDisplay()
    return d.workArea
  },

  cursorPoint() {
    return screen.getCursorScreenPoint()
  },

  displayNearestCursor() {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  }
}
