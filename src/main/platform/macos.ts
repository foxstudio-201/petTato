import { app } from 'electron'

/**
 * macOS autostart via the Login Items / LaunchAgent registration exposed by
 * Electron's `setLoginItemSettings`. `openAsHidden` keeps the pet unobtrusive
 * on login.
 */
export function setAutostart(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  })
}

export function getAutostart(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function platformName(): string {
  return `macOS (${process.getSystemVersion?.() ?? ''})`
}
