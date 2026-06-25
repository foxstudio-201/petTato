import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { PetSnapshot, InteractionType, DialogueLine } from '../shared/types.js'

/**
 * Secure context bridge. The renderer never touches Node or ipcRenderer
 * directly — only the typed, minimal surface defined here is exposed on
 * `window.pettato`.
 */
type Unsub = () => void
function on(channel: string, cb: (...args: any[]) => void): Unsub {
  const listener = (_e: IpcRendererEvent, ...args: any[]) => cb(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  init: () => ipcRenderer.invoke('pet:init'),
  snapshot: (): Promise<PetSnapshot> => ipcRenderer.invoke('pet:snapshot'),
  interact: (type: InteractionType) => ipcRenderer.invoke('pet:interact', type),
  talk: (text: string): Promise<DialogueLine> =>
    ipcRenderer.invoke('pet:talk', text).then((r) => r.line ?? r),
  command: (text: string) => ipcRenderer.invoke('pet:command', text),
  packsList: () => ipcRenderer.invoke('packs:list'),
  packsImport: () => ipcRenderer.invoke('packs:import'),
  minigameStart: () => ipcRenderer.invoke('pet:minigame:start'),
  minigameAnswer: (id: string, answer: string) =>
    ipcRenderer.invoke('pet:minigame:answer', id, answer),

  drag: (x: number, y: number) => ipcRenderer.send('pet:drag', { x, y }),
  setInteractive: (interactive: boolean) => ipcRenderer.send('pet:set-interactive', interactive),
  openDashboard: () => ipcRenderer.send('pet:open-dashboard'),
  contextMenu: () => ipcRenderer.send('pet:contextmenu'),

  onSnapshot: (cb: (s: PetSnapshot) => void) => on('snapshot', cb),
  onFrame: (cb: (f: { x: number; y: number; facing: -1 | 1 }) => void) => on('frame', cb),
  onSpeech: (cb: (l: { text: string; notify?: boolean }) => void) => on('speech', cb),
  onConfig: (cb: (c: any) => void) => on('config', cb),
  onNavigate: (cb: (hash: string) => void) => on('navigate', cb)
}

contextBridge.exposeInMainWorld('pettato', api)

export type PettatoApi = typeof api
