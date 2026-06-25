import { join } from 'node:path'
import { homedir } from 'node:os'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { app } from 'electron'

/**
 * Linux autostart via the freedesktop.org autostart spec — a `.desktop` file
 * dropped in `~/.config/autostart`. Works across GNOME, KDE Plasma, XFCE and
 * Cinnamon on both X11 and Wayland.
 */
function autostartFile(): string {
  const dir = join(homedir(), '.config', 'autostart')
  return join(dir, 'pettato.desktop')
}

export function setAutostart(enabled: boolean): void {
  const file = autostartFile()
  if (enabled) {
    mkdirSync(join(homedir(), '.config', 'autostart'), { recursive: true })
    const exec = process.env.APPIMAGE || process.execPath
    const content = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=petTaTo',
      'Comment=Desktop virtual pet',
      `Exec=${exec}`,
      'Icon=pettato',
      'Terminal=false',
      'X-GNOME-Autostart-enabled=true',
      'Categories=Utility;'
    ].join('\n')
    writeFileSync(file, content + '\n')
  } else if (existsSync(file)) {
    rmSync(file)
  }
}

export function getAutostart(): boolean {
  return existsSync(autostartFile())
}

export function platformName(): string {
  return `linux (${process.env.XDG_SESSION_TYPE || 'unknown'}/${process.env.XDG_CURRENT_DESKTOP || 'de'})`
}

void app
