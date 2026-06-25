import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  Notification,
  nativeImage,
  screen,
  dialog,
  session,
  shell,
  type IpcMainInvokeEvent
} from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, copyFileSync } from 'node:fs'
import { PetEngine } from './core/engine.js'
import { CommandEngine } from './core/commands.js'
import { ApiServer } from './server/api.js'
import { Updater } from './updater.js'
import { ensureAssets, ensureAllBuiltins, listPacks, importPack } from './assets/generate.js'
import { ModManager } from './mods/loader.js'
import { platform } from './platform/index.js'
import { paths } from './paths.js'
import { log } from './logger.js'
import type { PetSnapshot } from '../shared/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isDev = !!process.env.ELECTRON_RENDERER_URL
const FRAME_MS = 33 // ~30fps movement integration

// electron-vite emits the preload as .mjs under "type":"module"; fall back to .js.
const PRELOAD = (() => {
  const mjs = join(__dirname, '..', 'preload', 'index.mjs')
  return existsSync(mjs) ? mjs : join(__dirname, '..', 'preload', 'index.js')
})()

// On Linux/Wayland, route through XWayland for reliable transparency + overlay.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
}

let engine: PetEngine
let commands: CommandEngine
let api: ApiServer
let updater: Updater
let mods: ModManager
let petWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let tray: Tray | null = null
let splashShownAt = 0
let tickTimer: NodeJS.Timeout | null = null
let frameTimer: NodeJS.Timeout | null = null
let autosaveTimer: NodeJS.Timeout | null = null
let assetsDir = ''

// Single-instance: focus existing pet instead of launching twice.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => openDashboard())
  app.whenReady().then(bootstrap).catch((e) => {
    log.error('Fatal during bootstrap:', e)
    app.quit()
  })
}

async function bootstrap(): Promise<void> {
  log.info('petTaTo starting on', platform.name())

  // 0. Animated splash while everything spins up
  createSplash()

  // 1. Engine + persistence
  engine = await PetEngine.create()

  // 2. Mods (may register personalities / dialogue before first snapshot use)
  mods = new ModManager()
  mods.loadAll()

  // 3. Assets (generated on first launch) — active pack + full species gallery
  const cfg = engine.config.get()
  const pack = ensureAssets(cfg.appearance.spritePack, cfg.appearance.houseAppearance)
  ensureAllBuiltins(cfg.appearance.houseAppearance)
  assetsDir = paths.generatedAssets()

  // 3b. Command engine (voice + text → pet control / app launching)
  commands = new CommandEngine(engine, () => platform.cursorPoint(), () => engine.config.get())

  // 3c. Allow microphone for speech recognition (loopback only)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === 'media')
  })

  // 4. Position engine on the configured monitor
  applyMonitorBounds()

  // 5. Local API + web control panel
  const rendererDir = join(__dirname, '..', 'renderer')
  updater = new Updater()
  api = new ApiServer({
    engine,
    rendererDir,
    assetsDir,
    onConfigChange: handleConfigChange,
    onBackup: (tag) => engine.db.backup(tag),
    onRestore: doRestore,
    onAutostart: (en) => {
      platform.setAutostart(en)
      engine.config.update({ system: { ...engine.config.get().system, autostart: en } })
    },
    onCommand: (text) => commands.run(text),
    onOpenModsFolder: () => {
      void shell.openPath(paths.mods())
    },
    updater,
    appVersion: app.getVersion()
  })
  try {
    await api.start(cfg.system.apiPort)
  } catch (e) {
    log.error('API server failed to start (port in use?):', e)
  }

  // 6. UI: overlay window + tray
  createPetWindow()
  createTray()
  registerIpc()
  void pack

  // 7. Loops
  startLoops()

  // 8. Forward engine events to UIs
  engine.on('update', (snap: PetSnapshot) => {
    petWindow?.webContents.send('snapshot', snap)
    updateTrayTooltip(snap)
  })
  engine.on('speech', (line: { text: string; notify?: boolean }) => {
    petWindow?.webContents.send('speech', line)
    if (line.notify && engine.config.get().interaction.notificationsEnabled) notify(line.text)
  })

  app.on('activate', () => {
    if (!petWindow) createPetWindow()
  })

  // 9. First-run setup: open the dashboard so the onboarding wizard shows.
  if (!engine.config.get().onboarded) openDashboard()

  // 10. Dismiss the splash once everything is ready (after a minimum showtime).
  closeSplashSoon()
}

// ---- splash ---------------------------------------------------------------
function createSplash(): void {
  const d = screen.getPrimaryDisplay()
  splashWindow = new BrowserWindow({
    width: 380,
    height: 300,
    x: Math.round(d.bounds.x + (d.bounds.width - 380) / 2),
    y: Math.round(d.bounds.y + (d.bounds.height - 300) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: { sandbox: false }
  })
  splashShownAt = Date.now()
  if (isDev) {
    splashWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/splash/index.html`)
  } else {
    splashWindow.loadFile(join(__dirname, '..', 'renderer', 'splash', 'index.html'))
  }
  splashWindow.once('ready-to-show', () => splashWindow?.show())
  splashWindow.on('closed', () => (splashWindow = null))
}

function closeSplashSoon(): void {
  const elapsed = Date.now() - splashShownAt
  const wait = Math.max(0, 1700 - elapsed)
  setTimeout(() => {
    splashWindow?.close()
    splashWindow = null
  }, wait)
}

// ---- monitor / bounds -----------------------------------------------------
function activeDisplay() {
  const idx = engine.config.get().window.startMonitor
  const all = screen.getAllDisplays()
  return all[idx] ?? screen.getPrimaryDisplay()
}

function applyMonitorBounds(): void {
  const d = activeDisplay()
  engine.setBounds({ x: d.workArea.x, y: d.workArea.y, width: d.workArea.width, height: d.workArea.height })
}

// ---- pet overlay window ---------------------------------------------------
function createPetWindow(): void {
  const d = activeDisplay()
  petWindow = new BrowserWindow({
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    alwaysOnTop: engine.config.get().window.alwaysOnTop,
    show: false,
    webPreferences: {
      preload: PRELOAD,
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  })

  petWindow.setAlwaysOnTop(engine.config.get().window.alwaysOnTop, 'screen-saver')
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Start fully click-through; the renderer asks for interactivity on hover.
  petWindow.setIgnoreMouseEvents(true, { forward: true })

  loadRenderer(petWindow, 'pet')
  petWindow.once('ready-to-show', () => {
    petWindow?.show()
    applyClickThrough()
  })
  petWindow.on('closed', () => (petWindow = null))
}

function applyClickThrough(): void {
  if (!petWindow) return
  const ct = engine.config.get().window.clickThrough
  petWindow.setIgnoreMouseEvents(true, { forward: !ct })
}

// ---- dashboard window -----------------------------------------------------
function openDashboard(hash = ''): void {
  if (dashboardWindow) {
    dashboardWindow.focus()
    if (hash) dashboardWindow.webContents.send('navigate', hash)
    return
  }
  dashboardWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    title: 'petTaTo — Control Panel',
    backgroundColor: '#0f1420',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD,
      sandbox: false,
      contextIsolation: true
    }
  })
  loadRenderer(dashboardWindow, 'dashboard', hash)
  dashboardWindow.on('closed', () => (dashboardWindow = null))
}

function loadRenderer(winp: BrowserWindow, page: 'pet' | 'dashboard', hash = ''): void {
  if (isDev) {
    winp.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}/index.html${hash}`)
  } else {
    winp.loadFile(join(__dirname, '..', 'renderer', page, 'index.html'), { hash: hash.replace('#', '') })
  }
}

// ---- tray -----------------------------------------------------------------
function trayImage(): Electron.NativeImage {
  const p = join(assetsDir, 'tray.png')
  if (existsSync(p)) return nativeImage.createFromPath(p)
  return nativeImage.createEmpty()
}

function createTray(): void {
  tray = new Tray(trayImage())
  tray.setToolTip('petTaTo')
  rebuildTrayMenu()
  tray.on('click', () => openDashboard())
}

function rebuildTrayMenu(): void {
  if (!tray) return
  const asleep = engine.snapshot().asleep
  const menu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => openDashboard() },
    { type: 'separator' },
    { label: 'Feed', click: () => engine.interact('feed') },
    { label: 'Play', click: () => engine.startMiniGame() && openDashboard('#/play') },
    { label: 'Pet', click: () => engine.interact('pet') },
    { label: asleep ? 'Wake Up' : 'Put to Sleep', click: () => { engine.interact(asleep ? 'wake' : 'sleep'); rebuildTrayMenu() } },
    { type: 'separator' },
    { label: 'Settings', click: () => openDashboard('#/settings') },
    { label: 'Backup Now', click: () => { const f = engine.db.backup('tray'); notify('Backup saved: ' + f) } },
    { type: 'separator' },
    { label: 'Quit petTaTo', click: () => quit() }
  ])
  tray.setContextMenu(menu)
}

let lastTooltip = ''
function updateTrayTooltip(snap: PetSnapshot): void {
  // On Linux the tray uses AppIndicator: tooltips aren't shown and every update
  // redraws the indicator, which makes an open menu flicker. Skip there.
  if (process.platform === 'linux') return
  const text = `${snap.name} — ${snap.emotion}${snap.asleep ? ' (asleep)' : ''}`
  if (text === lastTooltip) return
  lastTooltip = text
  tray?.setToolTip(text)
}

// ---- notifications --------------------------------------------------------
function notify(body: string): void {
  if (!Notification.isSupported()) return
  const icon = join(assetsDir, 'icon.png')
  new Notification({ title: 'petTaTo', body, icon: existsSync(icon) ? icon : undefined }).show()
}

// ---- loops ----------------------------------------------------------------
function startLoops(): void {
  stopLoops()
  const cfg = engine.config.get()
  tickTimer = setInterval(() => engine.tick(), Math.max(250, cfg.behaviour.tickMs))
  frameTimer = setInterval(stepFrame, FRAME_MS)
  autosaveTimer = setInterval(() => engine.save(), Math.max(5, cfg.system.autosaveSeconds) * 1000)
}

function stopLoops(): void {
  if (tickTimer) clearInterval(tickTimer)
  if (frameTimer) clearInterval(frameTimer)
  if (autosaveTimer) clearInterval(autosaveTimer)
}

function stepFrame(): void {
  const cfg = engine.config.get()
  if (cfg.window.followCursor) {
    const pt = platform.cursorPoint()
    const d = activeDisplay()
    if (pt.x >= d.bounds.x && pt.x <= d.bounds.x + d.bounds.width) engine.followCursor(pt.x, pt.y)
  }
  const res = engine.frame(FRAME_MS)
  const d = activeDisplay()
  // Send screen-relative position to the overlay (which spans the display).
  petWindow?.webContents.send('frame', {
    x: res.pos.x - d.bounds.x,
    y: res.pos.y - d.bounds.y,
    facing: res.facing
  })
}

// ---- config / restore -----------------------------------------------------
function handleConfigChange(): void {
  const cfg = engine.config.get()
  petWindow?.setAlwaysOnTop(cfg.window.alwaysOnTop, 'screen-saver')
  applyClickThrough()
  applyMonitorBounds()
  petWindow?.webContents.send('config', publicAppearance())
  engine.applyConfigChange()
  startLoops()
  rebuildTrayMenu()
}

async function doRestore(file: string): Promise<boolean> {
  try {
    const src = join(paths.backups(), file)
    if (!existsSync(src)) return false
    const { readFileSync } = await import('node:fs')
    await engine.db.importImage(new Uint8Array(readFileSync(src)))
    engine.setActivePet(engine.config.get().pet.activePetId)
    return true
  } catch (e) {
    log.error('restore failed', e)
    return false
  }
}

/** Resolve the active sprite pack's manifest + asset base URL. */
function currentPack() {
  const cfg = engine.config.get()
  const { manifest } = ensureAssets(cfg.appearance.spritePack, cfg.appearance.houseAppearance)
  const baseUrl = `http://127.0.0.1:${cfg.system.apiPort}/assets-gen/${cfg.appearance.spritePack}`
  return { manifest, baseUrl }
}

function publicAppearance() {
  const cfg = engine.config.get()
  const d = activeDisplay()
  const pk = currentPack()
  return {
    appearance: cfg.appearance,
    accessibility: cfg.accessibility,
    window: cfg.window,
    behaviour: cfg.behaviour,
    language: cfg.language,
    voice: cfg.voice,
    apiPort: cfg.system.apiPort,
    assetsBaseUrl: pk.baseUrl,
    manifest: pk.manifest,
    displayOrigin: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height }
  }
}

// ---- IPC ------------------------------------------------------------------
function registerIpc(): void {
  ipcMain.handle('pet:init', () => ({ snapshot: engine.snapshot(), ...publicAppearance() }))

  ipcMain.handle('pet:command', (_e: IpcMainInvokeEvent, text: string) => commands.run(text))
  ipcMain.handle('packs:list', () => listPacks())
  ipcMain.handle('packs:import', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Select a sprite-pack folder (must contain manifest.json)',
      properties: ['openDirectory']
    })
    if (res.canceled || !res.filePaths[0]) return { ok: false, error: 'cancelled' }
    return importPack(res.filePaths[0])
  })

  ipcMain.handle('pet:interact', (_e: IpcMainInvokeEvent, type) => engine.interact(type))
  ipcMain.handle('pet:talk', (_e, text: string) => engine.talk(text))
  ipcMain.handle('pet:minigame:start', () => engine.startMiniGame())
  ipcMain.handle('pet:minigame:answer', (_e, id: string, answer: string) => engine.answerMiniGame(id, answer))
  ipcMain.handle('pet:snapshot', () => engine.snapshot())

  ipcMain.on('pet:drag', (_e, p: { x: number; y: number }) => {
    const d = activeDisplay()
    engine.dragTo(p.x + d.bounds.x, p.y + d.bounds.y)
  })
  ipcMain.on('pet:set-interactive', (_e, interactive: boolean) => {
    if (!petWindow) return
    if (engine.config.get().window.clickThrough) {
      petWindow.setIgnoreMouseEvents(true, { forward: true })
      return
    }
    petWindow.setIgnoreMouseEvents(!interactive, { forward: true })
  })
  ipcMain.on('pet:open-dashboard', () => openDashboard())
  ipcMain.on('pet:contextmenu', () => {
    rebuildTrayMenu()
    tray?.popUpContextMenu()
  })
}

// ---- shutdown -------------------------------------------------------------
function quit(): void {
  app.quit()
}

app.on('before-quit', () => {
  stopLoops()
  try {
    engine?.save()
    engine?.close()
  } catch (e) {
    log.error('error on close', e)
  }
  api?.stop()
})

app.on('window-all-closed', () => {
  // The pet lives in the tray — intentionally do nothing so the app keeps
  // running even when the dashboard/overlay windows are closed.
})

void copyFileSync
