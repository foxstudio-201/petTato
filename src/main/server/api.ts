import express, { type Request, type Response, type NextFunction } from 'express'
import { createServer, type Server } from 'node:http'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PetEngine } from '../core/engine.js'
import { listPersonalities } from '../core/personality.js'
import { listPacks } from '../assets/generate.js'
import { platform } from '../platform/index.js'
import { paths } from '../paths.js'
import { log } from '../logger.js'
import type { Updater } from '../updater.js'
import type { InteractionType } from '../../shared/types.js'

export interface ServerDeps {
  engine: PetEngine
  rendererDir: string
  assetsDir: string
  onConfigChange: () => void
  onBackup: (tag?: string) => string
  onRestore: (file: string) => Promise<boolean>
  onAutostart: (enabled: boolean) => void
  onCommand: (text: string) => unknown
  onOpenModsFolder: () => void
  updater: Updater
  appVersion: string
}

/**
 * Local-only HTTP control panel + REST API. Binds exclusively to 127.0.0.1 so
 * it is never reachable off-machine, mirrors every desktop interaction, and
 * serves the built dashboard SPA. Live updates stream over SSE.
 */
export class ApiServer {
  private app = express()
  private server: Server | null = null
  private sseClients = new Set<Response>()

  constructor(private deps: ServerDeps) {
    this.configure()
    deps.engine.on('update', (snap) => this.broadcast('update', snap))
    deps.engine.on('speech', (line) => this.broadcast('speech', line))
    deps.updater.on('state', (state) => this.broadcast('updater', state))
  }

  private configure(): void {
    const app = this.app
    app.disable('x-powered-by')

    // Hard loopback guard: refuse anything that didn't arrive on localhost.
    app.use((req: Request, res: Response, next: NextFunction) => {
      const ip = req.socket.remoteAddress ?? ''
      if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next()
      res.status(403).json({ error: 'petTaTo API is local-only' })
    })

    // CORS for loopback only. The Electron dashboard window loads from file://
    // (Origin "null"), so it needs these headers to call the API. This is safe:
    // the server already refused every non-localhost peer above, so "*" here can
    // never be reached from off-machine.
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') {
        res.sendStatus(204)
        return
      }
      next()
    })

    app.use(express.json({ limit: '2mb' }))
    app.use(express.raw({ type: 'application/octet-stream', limit: '64mb' }))

    const e = this.deps.engine

    // ---- read endpoints --------------------------------------------------
    app.get('/api/pet', (_req, res) => res.json(e.snapshot()))
    app.get('/api/stats', (_req, res) => res.json(e.snapshot().stats))
    app.get('/api/personalities', (_req, res) => res.json(listPersonalities()))
    app.get('/api/config', (_req, res) => res.json(e.config.get()))
    app.get('/api/metrics', (_req, res) => res.json(e.metrics()))
    app.get('/api/logs', (_req, res) => res.json({ lines: log.tail(300) }))
    app.get('/api/displays', (_req, res) => res.json(platform.displays()))

    app.get('/api/memory', (_req, res) => {
      const id = e.snapshot().id
      res.json({
        recent: e.repos.recentMemories(id, 25),
        conversations: e.repos.recentConversations(id, 25),
        interactionCounts: e.repos.interactionCounts(id),
        favouriteActivity: e.repos.favouriteActivity(id),
        favouriteHours: e.repos.favouriteHours(id)
      })
    })

    app.get('/api/history', (_req, res) => res.json(e.repos.recentHistory(e.snapshot().id, 60)))
    app.get('/api/packs', (_req, res) => res.json(listPacks()))
    app.get('/api/pets', (_req, res) => res.json(e.repos.listPets().map((p) => ({ id: p.id, name: p.name, personalityId: p.personalityId }))))

    app.get('/api/mods', (_req, res) => {
      const dir = paths.mods()
      const mods = existsSync(dir)
        ? readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => {
              const manifest = join(dir, d.name, 'mod.json')
              let meta: unknown = {}
              try {
                if (existsSync(manifest)) meta = JSON.parse(readFileSync(manifest, 'utf-8'))
              } catch {
                /* ignore bad manifest */
              }
              return { id: d.name, meta }
            })
        : []
      res.json(mods)
    })

    app.get('/api/mods/dir', (_req, res) => res.json({ dir: paths.mods() }))
    app.post('/api/mods/open', (_req, res) => {
      this.deps.onOpenModsFolder()
      res.json({ ok: true })
    })

    // ---- update (GitHub API + direct installer download, no metadata) ----
    app.get('/api/update/state', (_req, res) => res.json({ current: this.deps.appVersion }))
    app.get('/api/update/check', async (_req, res) => res.json(await this.deps.updater.check()))
    app.post('/api/update/install', (_req, res) => {
      void this.deps.updater.install()
      res.json({ ok: true })
    })
    app.post('/api/update/open', (req, res) => {
      this.deps.updater.openDownloadPage(req.body?.url)
      res.json({ ok: true })
    })

    // ---- interaction endpoints ------------------------------------------
    const interactions: InteractionType[] = ['feed', 'talk', 'pet', 'play', 'sleep', 'wake', 'clean', 'gift', 'train']
    for (const type of interactions) {
      if (type === 'talk') continue
      app.post(`/api/${type}`, (_req, res) => res.json(e.interact(type)))
    }
    app.post('/api/talk', (req, res) => {
      const text = (req.body?.text ?? '').toString()
      res.json({ line: e.talk(text) })
    })
    // Voice/text command (open apps, control pet). Falls back to chat if no match.
    app.post('/api/command', (req, res) => {
      const text = (req.body?.text ?? '').toString()
      const result = this.deps.onCommand(text) as { matched?: boolean }
      if (result && result.matched === false) {
        res.json({ matched: false, line: e.talk(text) })
        return
      }
      res.json(result)
    })

    app.post('/api/minigame/start', (_req, res) => res.json(e.startMiniGame()))
    app.post('/api/minigame/answer', (req, res) => {
      const { id, answer } = req.body ?? {}
      res.json(e.answerMiniGame(String(id), String(answer)))
    })

    // ---- pet management --------------------------------------------------
    app.post('/api/pet/rename', (req, res) => {
      e.rename(String(req.body?.name ?? ''))
      res.json({ ok: true })
    })
    app.post('/api/pet/personality', (req, res) => {
      e.setPersonality(String(req.body?.personalityId ?? 'friendly'))
      res.json({ ok: true })
    })
    app.post('/api/pet/home', (_req, res) => {
      e.setHomeHere()
      res.json({ ok: true })
    })
    app.post('/api/pets', (req, res) => {
      const id = e.createPet(String(req.body?.name ?? 'New Pet'), String(req.body?.personalityId ?? 'friendly'))
      res.json({ id })
    })
    app.post('/api/pets/active', (req, res) => {
      const ok = e.setActivePet(Number(req.body?.id))
      res.json({ ok })
    })

    // ---- settings --------------------------------------------------------
    app.post('/api/settings', (req, res) => {
      const next = e.config.update(req.body ?? {})
      this.deps.onConfigChange()
      res.json(next)
    })
    app.post('/api/autostart', (req, res) => {
      const enabled = !!req.body?.enabled
      this.deps.onAutostart(enabled)
      res.json({ ok: true, enabled: platform.getAutostart() })
    })

    // ---- save manager ----------------------------------------------------
    app.get('/api/export', (_req, res) => {
      e.save()
      const buf = Buffer.from(e.db.exportImage())
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', 'attachment; filename="pettato-save.sqlite"')
      res.send(buf)
    })
    app.post('/api/import', async (req, res) => {
      try {
        const body = req.body as Buffer
        if (!body?.length) return res.status(400).json({ error: 'empty body' })
        await e.db.importImage(new Uint8Array(body))
        e.setActivePet(e.config.get().pet.activePetId)
        res.json({ ok: true })
      } catch (err) {
        log.error('import failed', err)
        res.status(500).json({ error: String(err) })
      }
    })
    app.post('/api/backup', (req, res) => {
      const file = this.deps.onBackup(String(req.body?.tag ?? 'manual'))
      res.json({ ok: true, file })
    })
    app.get('/api/backups', (_req, res) => {
      const dir = paths.backups()
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.sqlite')) : []
      res.json(files.sort().reverse())
    })
    app.post('/api/restore', async (req, res) => {
      const ok = await this.deps.onRestore(String(req.body?.file ?? ''))
      res.json({ ok })
    })

    // ---- live updates (SSE) ---------------------------------------------
    app.get('/api/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders?.()
      res.write(`event: update\ndata: ${JSON.stringify(e.snapshot())}\n\n`)
      this.sseClients.add(res)
      req.on('close', () => this.sseClients.delete(res))
    })

    // ---- static dashboard + generated assets ----------------------------
    app.use('/assets-gen', express.static(this.deps.assetsDir))
    if (existsSync(this.deps.rendererDir)) {
      app.use(express.static(this.deps.rendererDir))
      app.get('/', (_req, res) => res.redirect('/dashboard/index.html'))
    } else {
      app.get('/', (_req, res) =>
        res.type('html').send('<h1>petTaTo</h1><p>Dashboard build not found. Run <code>npm run build</code>.</p>')
      )
    }
  }

  private broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const c of this.sseClients) {
      try {
        c.write(payload)
      } catch {
        this.sseClients.delete(c)
      }
    }
  }

  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app)
      this.server.on('error', reject)
      // Bind ONLY to the loopback interface — never 0.0.0.0.
      this.server.listen(port, '127.0.0.1', () => {
        log.info(`Control panel + API on http://127.0.0.1:${port}`)
        resolve()
      })
    })
  }

  stop(): void {
    for (const c of this.sseClients) c.end()
    this.sseClients.clear()
    this.server?.close()
  }
}
