import { app } from 'electron'

/**
 * Windows autostart via the standard login-item registry entry, managed by
 * Electron's cross-process API. No manual registry editing required.
 */
export function setAutostart(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: []
  })
}

export function getAutostart(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function platformName(): string {
  return `windows (${process.getSystemVersion?.() ?? ''})`
}
