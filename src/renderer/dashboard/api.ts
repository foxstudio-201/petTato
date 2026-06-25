import type { PetSnapshot, AppConfig } from '../../shared/types'

/**
 * Dashboard API client. Always targets the loopback control-panel port. When
 * the panel is opened in a normal browser tab over http it uses the same
 * origin; when loaded inside the Electron window (file://) it falls back to the
 * default loopback port.
 */
const params = new URLSearchParams(location.search)
const port = params.get('port') ?? '3577'
export const API_BASE =
  location.protocol === 'http:' && location.port === port ? '' : `http://127.0.0.1:${port}`

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, init)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return (await res.json()) as T
}

const post = (path: string, body?: unknown) =>
  j(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })

export const api = {
  pet: () => j<PetSnapshot>('/api/pet'),
  config: () => j<AppConfig>('/api/config'),
  personalities: () => j<any[]>('/api/personalities'),
  memory: () => j<any>('/api/memory'),
  history: () => j<any[]>('/api/history'),
  metrics: () => j<any>('/api/metrics'),
  logs: () => j<{ lines: string[] }>('/api/logs'),
  displays: () => j<any[]>('/api/displays'),
  pets: () => j<any[]>('/api/pets'),
  mods: () => j<any[]>('/api/mods'),
  modsDir: () => j<{ dir: string }>('/api/mods/dir'),
  openModsFolder: () => post('/api/mods/open'),
  updateState: () => j<any>('/api/update/state'),
  updateCheck: () => post('/api/update/check'),
  updateDownload: () => post('/api/update/download'),
  updateInstall: () => post('/api/update/install'),
  packs: () => j<any[]>('/api/packs'),
  backups: () => j<string[]>('/api/backups'),
  command: (text: string) => post('/api/command', { text }),

  interact: (type: string) => post(`/api/${type}`),
  talk: (text: string) => post('/api/talk', { text }),
  settings: (patch: Partial<AppConfig>) => post('/api/settings', patch),
  autostart: (enabled: boolean) => post('/api/autostart', { enabled }),

  rename: (name: string) => post('/api/pet/rename', { name }),
  setPersonality: (personalityId: string) => post('/api/pet/personality', { personalityId }),
  setHome: () => post('/api/pet/home'),
  createPet: (name: string, personalityId: string) => post('/api/pets', { name, personalityId }),
  setActive: (id: number) => post('/api/pets/active', { id }),

  minigameStart: () => post('/api/minigame/start') as Promise<any>,
  minigameAnswer: (id: string, answer: string) => post('/api/minigame/answer', { id, answer }) as Promise<any>,

  backup: () => post('/api/backup'),
  restore: (file: string) => post('/api/restore', { file }),
  exportUrl: () => API_BASE + '/api/export',
  importSave: (bytes: ArrayBuffer) =>
    fetch(API_BASE + '/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes
    }).then((r) => r.json())
}

/** Subscribe to live snapshot updates over Server-Sent Events. */
export function subscribe(
  onUpdate: (s: PetSnapshot) => void,
  onSpeech?: (l: any) => void,
  onUpdater?: (s: any) => void
): () => void {
  const es = new EventSource(API_BASE + '/api/events')
  es.addEventListener('update', (e) => onUpdate(JSON.parse((e as MessageEvent).data)))
  if (onSpeech) es.addEventListener('speech', (e) => onSpeech(JSON.parse((e as MessageEvent).data)))
  if (onUpdater) es.addEventListener('updater', (e) => onUpdater(JSON.parse((e as MessageEvent).data)))
  return () => es.close()
}
