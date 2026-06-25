import { EventEmitter } from 'node:events'
import { createWriteStream, chmodSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { spawn } from 'node:child_process'
import { app, shell } from 'electron'
import { log } from './logger.js'

/**
 * Self-contained updater — no electron-updater, no latest*.yml / .blockmap / zip.
 * It asks the GitHub API for the latest release, compares versions, and (on the
 * user's click) downloads the installer asset matching the current OS straight
 * from the release, then launches it. Fully offline until the user checks.
 *
 *   Windows → download Setup .exe and run it, then quit (NSIS installs in place)
 *   Linux   → AppImage: chmod +x and launch the new version; .deb/.rpm: open it
 *   macOS   → open the downloaded .dmg for the user to drag into Applications
 *
 * Download progress is emitted as `state` events so the dashboard can show a bar.
 */
const REPO = 'foxstudio-201/petTato'
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`

export type UpdatePhase =
  | 'checking'
  | 'available'
  | 'none'
  | 'downloading'
  | 'installing'
  | 'ready'
  | 'error'

export interface Asset {
  name: string
  url: string
}

export interface UpdateState {
  phase: UpdatePhase
  current: string
  latest?: string
  url?: string
  asset?: Asset | null
  percent?: number
  message?: string
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** Pick the installer asset that fits the running OS. */
function pickAsset(assets: { name: string; browser_download_url: string }[]): Asset | null {
  const by = (re: RegExp) => assets.find((a) => re.test(a.name))
  let a: { name: string; browser_download_url: string } | undefined
  if (process.platform === 'win32') a = by(/Setup.*\.exe$/i) ?? by(/\.exe$/i) ?? by(/\.msi$/i)
  else if (process.platform === 'darwin') a = by(/\.dmg$/i)
  else a = by(/\.AppImage$/i) ?? by(/\.deb$/i) ?? by(/\.rpm$/i)
  return a ? { name: a.name, url: a.browser_download_url } : null
}

export class Updater extends EventEmitter {
  private latestAsset: Asset | null = null

  constructor(private currentVersion: string) {
    super()
  }

  get current(): string {
    return this.currentVersion
  }

  private state(s: Omit<UpdateState, 'current'>): UpdateState {
    const full: UpdateState = { current: this.currentVersion, ...s }
    this.emit('state', full)
    return full
  }

  async check(): Promise<UpdateState> {
    try {
      const res = await fetch(LATEST_API, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'petTaTo' }
      })
      if (!res.ok) return this.state({ phase: 'error', message: `HTTP ${res.status}` })
      const data = (await res.json()) as {
        tag_name?: string
        html_url?: string
        assets?: { name: string; browser_download_url: string }[]
      }
      const latest = String(data.tag_name ?? '').replace(/^v/, '')
      const url = data.html_url || RELEASES_PAGE
      this.latestAsset = pickAsset(data.assets ?? [])
      const hasUpdate = !!latest && compareVersions(latest, this.currentVersion) > 0
      log.info(`update check: current ${this.currentVersion}, latest ${latest}, update=${hasUpdate}`)
      return this.state({ phase: hasUpdate ? 'available' : 'none', latest, url, asset: this.latestAsset })
    } catch (err) {
      return this.state({ phase: 'error', message: String((err as Error)?.message ?? err) })
    }
  }

  /** Download the matched installer and launch it. */
  async install(): Promise<void> {
    const asset = this.latestAsset
    if (!asset) {
      this.openDownloadPage()
      return
    }
    try {
      const dir = join(tmpdir(), 'petTaTo-update')
      mkdirSync(dir, { recursive: true })
      const dest = join(dir, asset.name)
      this.state({ phase: 'downloading', percent: 0, asset })
      const res = await fetch(asset.url, { headers: { 'User-Agent': 'petTaTo' } })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const total = Number(res.headers.get('content-length') || 0)
      const reader = res.body.getReader()
      const file = createWriteStream(dest)
      let received = 0
      let lastPct = -1
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        file.write(Buffer.from(value))
        received += value.length
        if (total) {
          const pct = Math.round((received / total) * 100)
          if (pct !== lastPct) {
            lastPct = pct
            this.state({ phase: 'downloading', percent: pct, asset })
          }
        }
      }
      await new Promise<void>((resolve) => file.end(resolve))
      log.info(`update downloaded: ${dest}`)
      this.state({ phase: 'installing', asset })
      this.launch(dest)
    } catch (err) {
      this.state({ phase: 'error', message: String((err as Error)?.message ?? err) })
    }
  }

  private launch(file: string): void {
    if (process.platform === 'win32') {
      // NSIS silent install; it relaunches the app when finished.
      spawn(file, ['/S'], { detached: true, stdio: 'ignore' }).unref()
      setTimeout(() => app.quit(), 800)
    } else if (process.platform === 'linux' && /\.AppImage$/i.test(file)) {
      // Copy out of /tmp first: AppImageLauncher may try to move it and fail
      // across filesystems. Run with its integration disabled.
      let runPath = file
      try {
        const dest = join(homedir(), basename(file))
        copyFileSync(file, dest)
        chmodSync(dest, 0o755)
        runPath = dest
      } catch {
        try {
          chmodSync(file, 0o755)
        } catch {
          /* best effort */
        }
      }
      spawn(runPath, [], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, APPIMAGELAUNCHER_DISABLE: '1' }
      }).unref()
      setTimeout(() => app.quit(), 800)
    } else {
      // macOS .dmg or Linux .deb/.rpm — hand off to the OS installer/opener.
      void shell.openPath(file)
      this.state({ phase: 'ready', message: file })
    }
  }

  openDownloadPage(url?: string): void {
    void shell.openExternal(url || RELEASES_PAGE)
  }
}
