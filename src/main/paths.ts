import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

/**
 * Centralised filesystem layout. Everything the app writes lives under the
 * per-user Electron `userData` directory so the install is fully portable and
 * never needs admin rights. All data is local — no network paths anywhere.
 */
function ensure(dir: string): string {
  mkdirSync(dir, { recursive: true })
  return dir
}

export function userDataDir(): string {
  return app.getPath('userData')
}

export const paths = {
  root: () => ensure(userDataDir()),
  data: () => ensure(join(userDataDir(), 'data')),
  config: () => join(userDataDir(), 'config', 'config.json'),
  configDir: () => ensure(join(userDataDir(), 'config')),
  db: () => join(paths.data(), 'pettato.sqlite'),
  backups: () => ensure(join(userDataDir(), 'data', 'backups')),
  generatedAssets: () => ensure(join(userDataDir(), 'generated_assets')),
  mods: () => ensure(join(userDataDir(), 'mods')),
  logs: () => ensure(join(userDataDir(), 'logs'))
}
