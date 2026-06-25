import { EventEmitter } from 'node:events'
import { app } from 'electron'
import electronUpdater from 'electron-updater'
import { log } from './logger.js'

const { autoUpdater } = electronUpdater

/**
 * Thin wrapper around electron-updater that exposes a single normalized `state`
 * event the dashboard can render directly. The app is fully offline by default:
 * nothing is checked until the user explicitly clicks "Check for updates", and
 * downloads only begin after a check finds a newer GitHub release.
 *
 * Auto-update only works in a packaged build. In `npm run dev` (not packaged)
 * electron-updater would throw, so we short-circuit with a `dev` phase instead.
 */
export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'none'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'dev'

export interface UpdateState {
  phase: UpdatePhase
  version?: string
  percent?: number
  message?: string
}

export class Updater extends EventEmitter {
  lastState: UpdateState = { phase: 'idle' }

  constructor() {
    super()
    autoUpdater.autoDownload = false // we control when the download starts
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = null

    autoUpdater.on('checking-for-update', () => this.set({ phase: 'checking' }))
    autoUpdater.on('update-available', (info) => this.set({ phase: 'available', version: info.version }))
    autoUpdater.on('update-not-available', (info) => this.set({ phase: 'none', version: info?.version }))
    autoUpdater.on('download-progress', (p) => this.set({ phase: 'downloading', percent: Math.round(p.percent) }))
    autoUpdater.on('update-downloaded', (info) => this.set({ phase: 'ready', version: info.version }))
    autoUpdater.on('error', (err) => this.set({ phase: 'error', message: String(err?.message ?? err) }))
  }

  private set(state: UpdateState): void {
    this.lastState = state
    log.info(`updater: ${state.phase}${state.version ? ' ' + state.version : ''}${state.percent != null ? ' ' + state.percent + '%' : ''}`)
    this.emit('state', state)
  }

  private packaged(): boolean {
    if (app.isPackaged) return true
    this.set({ phase: 'dev', message: 'Updates only work in the installed app.' })
    return false
  }

  async check(): Promise<void> {
    if (!this.packaged()) return
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      this.set({ phase: 'error', message: String((err as Error)?.message ?? err) })
    }
  }

  async download(): Promise<void> {
    if (!this.packaged()) return
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      this.set({ phase: 'error', message: String((err as Error)?.message ?? err) })
    }
  }

  install(): void {
    if (!this.packaged()) return
    // Quit and install the downloaded update. `isSilent=false`, `forceRunAfter=true`.
    autoUpdater.quitAndInstall(false, true)
  }
}
