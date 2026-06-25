import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import type { PetEngine } from './engine.js'
import type { AppConfig, InteractionType } from '../../shared/types.js'
import { log } from '../logger.js'

/**
 * Local, offline command engine. Turns a transcript (from speech recognition or
 * typed text) into an intent and executes it — controlling the pet or launching
 * other desktop applications. Understands English and Vietnamese keywords. No
 * network, no cloud NLP; pure keyword/intent matching.
 */
export interface CommandResult {
  ok: boolean
  intent: string
  reply: string
  /** True when the input matched a command (vs. should be treated as chat). */
  matched: boolean
}

type Cands = [string, string[]][]

function spawnChain(cands: Cands): void {
  let i = 0
  const attempt = () => {
    if (i >= cands.length) return
    const [cmd, args] = cands[i++]
    try {
      const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
      child.on('error', attempt)
      child.unref()
    } catch {
      attempt()
    }
  }
  attempt()
}

/** Resolve a launch command chain for a known app target on this platform. */
function appLauncher(target: string): Cands | null {
  const p = process.platform
  const home = homedir()
  const win = p === 'win32'
  const mac = p === 'darwin'

  const table: Record<string, Cands> = {
    browser: win
      ? [['cmd', ['/c', 'start', '', 'https://']]]
      : mac
        ? [['open', ['https://']]]
        : [['xdg-open', ['https://']]],
    files: win
      ? [['explorer', [home]]]
      : mac
        ? [['open', [home]]]
        : [['xdg-open', [home]]],
    terminal: win
      ? [['cmd', ['/c', 'start', 'cmd']]]
      : mac
        ? [['open', ['-a', 'Terminal']]]
        : [
            ['x-terminal-emulator', []],
            ['gnome-terminal', []],
            ['konsole', []],
            ['xfce4-terminal', []],
            ['xterm', []]
          ],
    calculator: win
      ? [['calc', []]]
      : mac
        ? [['open', ['-a', 'Calculator']]]
        : [['gnome-calculator', []], ['kcalc', []], ['galculator', []]],
    editor: win
      ? [['notepad', []]]
      : mac
        ? [['open', ['-a', 'TextEdit']]]
        : [['gnome-text-editor', []], ['gedit', []], ['kate', []], ['xed', []]],
    music: win
      ? [['cmd', ['/c', 'start', 'mswindowsmusic:']]]
      : mac
        ? [['open', ['-a', 'Music']]]
        : [['rhythmbox', []], ['xdg-open', [home + '/Music']]],
    email: win
      ? [['cmd', ['/c', 'start', 'mailto:']]]
      : mac
        ? [['open', ['mailto:']]]
        : [['xdg-open', ['mailto:']]],
    settings: win
      ? [['cmd', ['/c', 'start', 'ms-settings:']]]
      : mac
        ? [['open', ['-a', 'System Settings']]]
        : [['gnome-control-center', []], ['systemsettings', []], ['xfce4-settings-manager', []]]
  }
  return table[target] ?? null
}

/** A free-form app name → best-effort launch chain. */
function genericLauncher(name: string): Cands {
  const p = process.platform
  if (p === 'win32') return [['cmd', ['/c', 'start', '', name]], [name, []]]
  if (p === 'darwin') return [['open', ['-a', name]]]
  return [[name, []], ['xdg-open', [name]]]
}

interface Lex {
  intent: string
  // any of these substrings triggers the intent
  kw: string[]
}

// Pet-action intents (order matters: more specific first).
const ACTION_LEX: Lex[] = [
  { intent: 'come', kw: ['come here', 'come', 'follow me', 'lại đây', 'đến đây', 'lại đi', 'theo'] },
  { intent: 'home', kw: ['go home', 'home', 'về nhà', 'về chỗ', 'về'] },
  { intent: 'feed', kw: ['feed', 'eat', 'food', 'hungry', 'snack', 'cho ăn', 'ăn', 'đói', 'thức ăn'] },
  { intent: 'play', kw: ['play', 'game', 'fun', 'chơi', 'trò chơi'] },
  { intent: 'sleep', kw: ['sleep', 'nap', 'go to bed', 'bedtime', 'ngủ', 'đi ngủ'] },
  { intent: 'wake', kw: ['wake', 'wake up', 'get up', 'dậy', 'thức dậy'] },
  { intent: 'clean', kw: ['clean', 'wash', 'bath', 'shower', 'tắm', 'lau', 'dọn', 'rửa'] },
  { intent: 'pet', kw: ['pet you', 'pat', 'stroke', 'cuddle', 'good pet', 'vuốt', 'xoa', 'cưng'] },
  { intent: 'train', kw: ['train', 'practice', 'learn', 'huấn luyện', 'tập', 'học'] },
  { intent: 'gift', kw: ['gift', 'present', 'quà', 'tặng'] }
]

const APP_LEX: { target: string; kw: string[] }[] = [
  { target: 'browser', kw: ['browser', 'chrome', 'firefox', 'edge', 'web', 'internet', 'trình duyệt'] },
  { target: 'terminal', kw: ['terminal', 'console', 'shell', 'command', 'dòng lệnh', 'cửa sổ lệnh'] },
  { target: 'files', kw: ['files', 'file manager', 'explorer', 'finder', 'folder', 'thư mục', 'tệp'] },
  { target: 'calculator', kw: ['calculator', 'calc', 'máy tính', 'tính toán'] },
  { target: 'editor', kw: ['editor', 'notepad', 'text editor', 'notes', 'soạn thảo', 'ghi chú'] },
  { target: 'music', kw: ['music', 'player', 'spotify', 'nhạc', 'âm nhạc'] },
  { target: 'email', kw: ['email', 'mail', 'thư điện tử', 'thư'] },
  { target: 'settings', kw: ['settings', 'control panel', 'preferences', 'cài đặt', 'thiết lập'] }
]

const OPEN_KW = ['open', 'launch', 'start', 'run', 'mở', 'khởi động', 'chạy', 'bật']

function reply(lang: string, en: string, vi: string): string {
  return lang === 'vi' ? vi : en
}

export class CommandEngine {
  private engine: PetEngine
  private getCursor: () => { x: number; y: number }
  private getConfig: () => AppConfig

  constructor(engine: PetEngine, getCursor: () => { x: number; y: number }, getConfig: () => AppConfig) {
    this.engine = engine
    this.getCursor = getCursor
    this.getConfig = getConfig
  }

  /** Parse and execute a transcript. Returns matched=false if it's just chat. */
  run(text: string): CommandResult {
    const t = (text ?? '').toLowerCase().trim()
    const cfg = this.getConfig()
    const lang = cfg.language

    // 1. App launch ("open <something>")
    if (OPEN_KW.some((k) => t.includes(k))) {
      if (!cfg.voice.allowAppLaunch) {
        return { ok: false, matched: true, intent: 'open', reply: reply(lang, 'App launching is disabled in settings.', 'Mở ứng dụng đang bị tắt trong cài đặt.') }
      }
      for (const a of APP_LEX) {
        if (a.kw.some((k) => t.includes(k))) {
          const chain = appLauncher(a.target)
          if (chain) {
            spawnChain(chain)
            log.info('Voice command launched app:', a.target)
            const msg = reply(lang, `Opening ${a.target}!`, `Đang mở ${a.target}!`)
            this.engine.speak(msg)
            return { ok: true, matched: true, intent: 'open:' + a.target, reply: msg }
          }
        }
      }
      // generic: take the word after the open keyword
      const m = t.match(/(?:open|launch|start|run|mở|chạy|bật|khởi động)\s+(?:the\s+|app\s+|ứng dụng\s+)?([a-z0-9 ._-]{2,30})/)
      if (m && m[1]) {
        const name = m[1].trim().split(' ')[0]
        spawnChain(genericLauncher(name))
        const msg = reply(lang, `Trying to open ${name}…`, `Đang thử mở ${name}…`)
        this.engine.speak(msg)
        return { ok: true, matched: true, intent: 'open:' + name, reply: msg }
      }
    }

    // 2. Pet-control intents
    for (const a of ACTION_LEX) {
      if (a.kw.some((k) => t.includes(k))) {
        return this.runAction(a.intent, lang)
      }
    }

    // Not a command — caller should treat it as chat.
    return { ok: false, matched: false, intent: 'none', reply: '' }
  }

  private runAction(intent: string, lang: string): CommandResult {
    const e = this.engine
    if (intent === 'come') {
      const c = this.getCursor()
      e.moveTo(c.x, c.y)
      const msg = reply(lang, 'Coming!', 'Đến ngay!')
      e.speak(msg)
      return { ok: true, matched: true, intent, reply: msg }
    }
    if (intent === 'home') {
      e.sendHome()
      const msg = reply(lang, 'Heading home!', 'Đang về nhà!')
      e.speak(msg)
      return { ok: true, matched: true, intent, reply: msg }
    }
    const r = e.interact(intent as InteractionType)
    return { ok: r.ok, matched: true, intent, reply: r.line.text }
  }
}
