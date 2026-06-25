import { EventEmitter } from 'node:events'
import type {
  PetSnapshot,
  Stats,
  InteractionType,
  Vec2,
  DialogueLine
} from '../../shared/types.js'
import { Database } from '../db/database.js'
import { Repositories, type PetRecord } from '../db/repositories.js'
import { ConfigStore } from '../config.js'
import { log } from '../logger.js'
import { getPersonality } from './personality.js'
import { timeOfDay, daylightFactor } from './time.js'
import { defaultStats, applyDecay, applyDelta, clampStats } from './stats.js'
import { dominantEmotion, topEmotions } from './emotions.js'
import { decide, type Behaviour } from './stateMachine.js'
import {
  type ScreenBounds,
  pickWanderTarget,
  homeTarget,
  stepToward,
  speedFor,
  distance,
  clampToBounds,
  groundY
} from './movement.js'
import { DialogueEngine, type DialogueContext } from './dialogue.js'
import { INTERACTION_EFFECTS, makeMiniGame, type MiniGame } from './interactions.js'

/** Public mini-game shape (never leaks the answer to the client). */
export interface MiniGamePublic {
  id: string
  kind: MiniGame['kind']
  prompt: string
  options: string[]
}

/**
 * The PetEngine owns the live simulation for the active pet. It separates the
 * cheap, slow *tick* (stats, emotions, behaviour decisions, dialogue) from the
 * smooth, fast *frame* (window movement integration), and emits `update` /
 * `speech` events the rest of the app reacts to.
 */
export class PetEngine extends EventEmitter {
  readonly db: Database
  readonly repos: Repositories
  readonly config: ConfigStore

  private pet!: PetRecord
  private bounds: ScreenBounds = { x: 0, y: 0, width: 1280, height: 800 }
  private behaviour: Behaviour = { state: 'idle', goal: 'stay', durationMs: 2000 }
  private behaviourStarted = Date.now()
  private target: Vec2 = { x: 200, y: 600 }
  private facing: -1 | 1 = 1
  private lastTick = Date.now()
  private speech: { text: string; until: number } | null = null
  private dialogue = new DialogueEngine()
  private activeGames = new Map<string, MiniGame>()
  private locked = false
  private lockUntil = 0
  private tickCount = 0
  private startedAt = Date.now()

  private constructor(db: Database, config: ConfigStore) {
    super()
    this.db = db
    this.config = config
    this.repos = new Repositories(db)
  }

  static async create(): Promise<PetEngine> {
    const db = await Database.open()
    const config = new ConfigStore()
    const engine = new PetEngine(db, config)
    engine.init()
    return engine
  }

  // ---- lifecycle --------------------------------------------------------
  private init(): void {
    const cfg = this.config.get()
    let pet = this.repos.getPet(cfg.pet.activePetId) ?? this.repos.listPets()[0]
    if (!pet) {
      const id = this.createPet('Tato', 'friendly')
      pet = this.repos.getPet(id)!
      this.config.update({ pet: { activePetId: id } })
    }
    this.pet = pet
    this.applyOfflineProgression()
    this.target = { x: this.pet.posX, y: this.pet.posY }
    this.facing = this.pet.facing
    this.lastTick = Date.now()
    log.info(`Loaded pet "${this.pet.name}" (#${this.pet.id})`)
  }

  /** Calculate elapsed time since last session and fast-forward the sim. */
  private applyOfflineProgression(): void {
    const now = Date.now()
    const elapsed = Math.max(0, now - this.pet.lastSeen)
    if (elapsed < 1000) return
    const ctx = {
      elapsedMs: elapsed,
      asleep: this.pet.asleep,
      personality: this.pet.personality,
      daylight: daylightFactor(),
      nearHome: this.isNearHome()
    }
    this.pet.stats = applyDecay(clampStats({ ...defaultStats(), ...this.pet.stats }), ctx)
    this.pet.lastSeen = now
    const mins = Math.round(elapsed / 60000)
    if (mins >= 5) {
      this.repos.addMemory(this.pet.id, 'absence', `Away for ~${mins} min`, Math.min(5, mins / 60))
      this.repos.addHistory(this.pet.id, 'offline_progression', { minutes: mins })
    }
    log.info(`Applied offline progression: ${mins} min elapsed`)
  }

  setBounds(b: ScreenBounds): void {
    this.bounds = b
    // keep the pet on the ground line of the (possibly new) monitor
    this.pet.posX = clampToBounds({ x: this.pet.posX, y: groundY(b) }, b).x
    this.pet.posY = groundY(b)
    if (this.pet.homeY === 600 || this.pet.homeY < b.y) {
      this.pet.homeX = b.x + 120
      this.pet.homeY = groundY(b)
    }
  }

  applyConfigChange(): void {
    // currently nothing cached that needs rebuilding; placeholder for future tuning
  }

  // ---- main simulation tick (slow) --------------------------------------
  tick(): void {
    const now = Date.now()
    const elapsed = now - this.lastTick
    this.lastTick = now
    this.tickCount++
    this.pet.timeTogetherMs += elapsed
    this.pet.lastSeen = now

    // 1. stat decay
    this.pet.stats = applyDecay(this.pet.stats, {
      elapsedMs: elapsed,
      asleep: this.pet.asleep,
      personality: this.pet.personality,
      daylight: daylightFactor(),
      nearHome: this.isNearHome()
    })

    // 2. sleep/wake automation
    this.autoSleepWake()

    // 3. interaction lock expiry
    if (this.locked && now >= this.lockUntil) this.locked = false

    // 4. behaviour decision
    if (now - this.behaviourStarted >= this.behaviour.durationMs) {
      this.chooseBehaviour()
    }

    // 5. dialogue (spontaneous + attention)
    this.maybeSpeak()

    // 6. speech expiry
    if (this.speech && now >= this.speech.until) this.speech = null

    this.emit('update', this.snapshot())
  }

  private autoSleepWake(): void {
    const s = this.pet.stats
    const tod = timeOfDay()
    if (!this.pet.asleep) {
      const wantSleep = s.energy < 14 || (tod === 'night' && s.energy < 28)
      if (wantSleep && this.isNearHome()) {
        this.pet.asleep = true
        this.setState('sleeping', 'stay', 6000)
        this.say(this.dialogue.react('sleep', this.dialogCtx()), 5000, false)
      }
    } else {
      const wake = s.energy > 92 || (tod === 'morning' && s.energy > 62)
      if (wake) {
        this.pet.asleep = false
        this.setState('idle', 'stay', 2500)
        this.say(this.dialogue.react('wake', this.dialogCtx()), 4000, false)
      }
    }
  }

  private chooseBehaviour(): void {
    const b = decide({
      stats: this.pet.stats,
      emotion: this.currentEmotion(),
      timeOfDay: timeOfDay(),
      personality: this.pet.personality,
      asleep: this.pet.asleep,
      current: this.behaviour.state,
      rand: Math.random,
      locked: this.locked
    })
    this.behaviour = b
    this.behaviourStarted = Date.now()
    this.pet.state = b.state
    // resolve a movement target for the chosen goal
    if (b.goal === 'wander') {
      this.target = pickWanderTarget({ x: this.pet.posX, y: this.pet.posY }, this.bounds, this.pet.personality, Math.random, this.config.get().behaviour.freeRoam)
    } else if (b.goal === 'home') {
      this.target = homeTarget({ x: this.pet.homeX, y: this.pet.homeY }, this.bounds)
    } else {
      this.target = { x: this.pet.posX, y: this.pet.posY }
    }
  }

  private setState(state: Behaviour['state'], goal: Behaviour['goal'], durationMs: number): void {
    this.behaviour = { state, goal, durationMs }
    this.behaviourStarted = Date.now()
    this.pet.state = state
    if (goal === 'home') this.target = homeTarget({ x: this.pet.homeX, y: this.pet.homeY }, this.bounds)
    if (goal === 'stay') this.target = { x: this.pet.posX, y: this.pet.posY }
  }

  // ---- movement frame (fast) --------------------------------------------
  /** Integrate movement toward target. Returns new position if it changed. */
  frame(dtMs: number): { moved: boolean; pos: Vec2; facing: -1 | 1 } {
    if (this.pet.asleep || this.behaviour.goal === 'stay') {
      return { moved: false, pos: { x: this.pet.posX, y: this.pet.posY }, facing: this.facing }
    }
    const speed = speedFor(this.behaviour.state, this.pet.personality)
    const res = stepToward({ x: this.pet.posX, y: this.pet.posY }, this.target, speed, dtMs)
    const moved = res.pos.x !== this.pet.posX || res.pos.y !== this.pet.posY
    this.pet.posX = res.pos.x
    this.pet.posY = res.pos.y
    this.facing = res.facing
    this.pet.facing = res.facing
    if (res.arrived && this.behaviour.goal === 'home') {
      // arrived home: settle
      this.setState(this.pet.stats.energy < 30 ? 'sleeping' : 'sitting', 'stay', 5000)
      if (this.pet.stats.energy < 20) this.pet.asleep = true
    }
    return { moved, pos: res.pos, facing: res.facing }
  }

  // ---- dialogue / speech ------------------------------------------------
  private maybeSpeak(): void {
    if (this.speech || this.locked || this.pet.asleep) return
    const cfg = this.config.get()
    if (!cfg.interaction.notificationsEnabled) return

    // Critical attention requests have priority and notify.
    const attn = this.dialogue.attention(this.dialogCtx())
    if (attn && Math.random() < 0.5) {
      this.say(attn, 6000, true)
      return
    }
    // Spontaneous chatter, gated by speech frequency × talkativeness.
    const chance = cfg.behaviour.speechFrequency * this.pet.personality.talkativeness * 0.12
    if (Math.random() < chance) {
      const line = this.dialogue.spontaneous(this.dialogCtx())
      if (line) this.say(line, 5000, false)
    }
  }

  /** Make the pet say an arbitrary line (used by the command engine). */
  speak(text: string, durationMs = 5000): void {
    this.say({ text, source: 'command' }, durationMs, false)
  }

  private say(line: DialogueLine, durationMs: number, notify: boolean): void {
    this.speech = { text: line.text, until: Date.now() + durationMs }
    this.repos.addConversation(this.pet.id, 'pet', line.text)
    this.emit('speech', { ...line, notify })
  }

  private dialogCtx(): DialogueContext {
    const last = this.repos.lastInteractionAt(this.pet.id)
    const cfg = this.config.get()
    return {
      name: this.pet.name,
      owner: cfg.ownerName,
      lang: cfg.language,
      emotion: this.currentEmotion(),
      stats: this.pet.stats,
      timeOfDay: timeOfDay(),
      tone: this.pet.personality.tone,
      favouriteActivity: this.repos.favouriteActivity(this.pet.id),
      favouriteHours: this.repos.favouriteHours(this.pet.id),
      minutesSinceLastVisit: last ? Math.round((Date.now() - last) / 60000) : null,
      ageDays: (Date.now() - this.pet.bornAt) / 86400000,
      hoursTogether: this.pet.timeTogetherMs / 3600000,
      rand: Math.random
    }
  }

  // ---- interactions -----------------------------------------------------
  interact(type: InteractionType): { ok: boolean; line: DialogueLine } {
    if (type === 'sleep') {
      this.pet.asleep = true
      this.setState('sleeping', 'stay', 6000)
    } else if (type === 'wake') {
      this.pet.asleep = false
      this.setState('idle', 'stay', 2500)
    } else {
      const effect = INTERACTION_EFFECTS[type]
      const scale = this.config.get().interaction.rewardScale
      this.pet.stats = applyDelta(this.pet.stats, effect, scale)
      // brief locked animation for feed/play/train
      if (type === 'feed') this.lockBehaviour('eating', 2200)
      else if (type === 'play') this.lockBehaviour('playing', 2600)
      else if (type === 'talk') this.lockBehaviour('talking', 2000)
      else if (type === 'train') this.lockBehaviour('playing', 2400)
      else if (type === 'pet') this.lockBehaviour('happy', 1600)
    }

    this.repos.logInteraction(this.pet.id, type)
    this.repos.addMemory(this.pet.id, `interaction:${type}`, `User did "${type}"`, 1)
    this.repos.addHistory(this.pet.id, 'interaction', { type })

    const line = this.dialogue.react(type, this.dialogCtx())
    this.say(line, 4000, false)
    this.emit('update', this.snapshot())
    return { ok: true, line }
  }

  private lockBehaviour(state: Behaviour['state'], ms: number): void {
    this.locked = true
    this.lockUntil = Date.now() + ms
    this.setState(state, 'stay', ms)
  }

  /** User-typed chat → local response. */
  talk(text: string): DialogueLine {
    const clean = (text ?? '').slice(0, 500)
    this.repos.addConversation(this.pet.id, 'user', clean)
    this.repos.logInteraction(this.pet.id, 'talk')
    this.pet.stats = applyDelta(this.pet.stats, { social: 12, happiness: 4 }, this.config.get().interaction.rewardScale)
    const line = this.dialogue.respond(clean, this.dialogCtx())
    this.lockBehaviour('talking', 2000)
    this.say(line, 5000, false)
    return line
  }

  // ---- mini-games -------------------------------------------------------
  startMiniGame(): MiniGamePublic {
    const g = makeMiniGame(this.config.get().interaction.quizDifficulty, Math.random)
    this.activeGames.set(g.id, g)
    this.lockBehaviour('playing', 4000)
    return { id: g.id, kind: g.kind, prompt: g.prompt, options: g.options }
  }

  answerMiniGame(id: string, answer: string): { correct: boolean; line: DialogueLine; reward?: Partial<Stats> } {
    const g = this.activeGames.get(id)
    if (!g) return { correct: false, line: { text: "Hmm, that game already ended!", source: 'minigame' } }
    this.activeGames.delete(id)
    const correct = String(answer).trim() === g.answer
    if (correct) {
      this.pet.stats = applyDelta(this.pet.stats, g.reward, this.config.get().interaction.rewardScale)
      this.repos.addMemory(this.pet.id, 'minigame', `Won a ${g.kind} game`, 2)
      this.repos.logInteraction(this.pet.id, 'play')
      const line: DialogueLine = { text: 'Yay, correct! That was fun!', source: 'minigame' }
      this.say(line, 4000, false)
      this.emit('update', this.snapshot())
      return { correct, line, reward: g.reward }
    }
    this.pet.stats = applyDelta(this.pet.stats, { happiness: -2 })
    const line: DialogueLine = { text: `Aw, not quite — it was "${g.answer}". Let's try again sometime!`, source: 'minigame' }
    this.say(line, 5000, false)
    this.emit('update', this.snapshot())
    return { correct, line }
  }

  // ---- pet management ---------------------------------------------------
  createPet(name: string, personalityId: string): number {
    const personality = getPersonality(personalityId)
    const gx = this.bounds.x + 120
    const gy = groundY(this.bounds)
    return this.repos.createPet({
      name,
      personalityId,
      personality,
      stats: defaultStats(),
      homeX: gx,
      homeY: gy,
      homeAppearance: this.config.get().appearance.houseAppearance,
      posX: gx + 80,
      posY: gy
    })
  }

  setActivePet(id: number): boolean {
    const pet = this.repos.getPet(id)
    if (!pet) return false
    this.save()
    this.pet = pet
    this.config.update({ pet: { activePetId: id } })
    this.applyOfflineProgression()
    this.setBounds(this.bounds)
    this.emit('update', this.snapshot())
    return true
  }

  rename(name: string): void {
    this.pet.name = name.slice(0, 40) || this.pet.name
    this.emit('update', this.snapshot())
  }

  setPersonality(id: string): void {
    this.pet.personalityId = id
    this.pet.personality = getPersonality(id)
    this.emit('update', this.snapshot())
  }

  /** Manually drag the pet to a screen position (from the overlay). */
  dragTo(x: number, y: number): void {
    const freeRoam = this.config.get().behaviour.freeRoam
    const p = clampToBounds({ x, y: freeRoam ? y : groundY(this.bounds) }, this.bounds, freeRoam)
    this.pet.posX = p.x
    this.pet.posY = p.y
    this.target = p
    this.behaviour = { state: 'idle', goal: 'stay', durationMs: 1500 }
    this.behaviourStarted = Date.now()
  }

  /** Walk the pet to a screen point (used by the "come here" voice command). */
  moveTo(x: number, y: number): void {
    if (this.pet.asleep) {
      this.pet.asleep = false
    }
    const freeRoam = this.config.get().behaviour.freeRoam
    this.target = clampToBounds({ x: x - 40, y: freeRoam ? y - 40 : groundY(this.bounds) }, this.bounds, freeRoam)
    this.locked = false
    this.behaviour = { state: 'running', goal: 'wander', durationMs: 4000 }
    this.behaviourStarted = Date.now()
    this.pet.state = 'running'
  }

  /** Steer the pet toward the cursor (follow-cursor mode). */
  followCursor(screenX: number, screenY?: number): void {
    if (this.pet.asleep || this.locked) return
    const freeRoam = this.config.get().behaviour.freeRoam
    const y = freeRoam && screenY !== undefined ? screenY - 40 : groundY(this.bounds)
    this.target = clampToBounds({ x: screenX - 40, y }, this.bounds, freeRoam)
    if (Math.hypot(this.target.x - this.pet.posX, this.target.y - this.pet.posY) > 6) {
      this.behaviour = { state: 'walking', goal: 'wander', durationMs: 800 }
      this.behaviourStarted = Date.now()
      this.pet.state = 'walking'
    }
  }

  /** Send the pet back toward its home (used by the "go home" command). */
  sendHome(): void {
    if (this.pet.asleep) this.pet.asleep = false
    this.locked = false
    this.setState('returningHome', 'home', 6000)
  }

  setHomeHere(): void {
    this.pet.homeX = this.pet.posX
    this.pet.homeY = this.pet.posY
    this.repos.addHistory(this.pet.id, 'home_moved', { x: this.pet.posX })
    this.emit('update', this.snapshot())
  }

  // ---- persistence ------------------------------------------------------
  save(): void {
    this.pet.lastSeen = Date.now()
    this.repos.savePet(this.pet)
    this.db.flush()
  }

  close(): void {
    this.save()
    this.db.close()
  }

  // ---- queries / snapshot ----------------------------------------------
  private isNearHome(): boolean {
    return distance({ x: this.pet.posX, y: this.pet.posY }, { x: this.pet.homeX, y: this.pet.homeY }) < 90
  }

  private currentEmotion() {
    return dominantEmotion({ stats: this.pet.stats, timeOfDay: timeOfDay(), asleep: this.pet.asleep })
  }

  snapshot(): PetSnapshot {
    const tod = timeOfDay()
    return {
      id: this.pet.id,
      name: this.pet.name,
      personality: this.pet.personality,
      stats: this.pet.stats,
      emotion: this.currentEmotion(),
      emotionScores: topEmotions({ stats: this.pet.stats, timeOfDay: tod, asleep: this.pet.asleep }),
      state: this.pet.state,
      facing: this.facing,
      position: { x: this.pet.posX, y: this.pet.posY },
      target: this.target,
      home: { x: this.pet.homeX, y: this.pet.homeY, appearance: this.pet.homeAppearance },
      timeOfDay: tod,
      speech: this.speech?.text ?? null,
      bornAt: this.pet.bornAt,
      timeTogetherMs: this.pet.timeTogetherMs,
      ageDays: (Date.now() - this.pet.bornAt) / 86400000,
      asleep: this.pet.asleep
    }
  }

  metrics() {
    const mem = process.memoryUsage()
    return {
      uptimeMs: Date.now() - this.startedAt,
      ticks: this.tickCount,
      tickMs: this.config.get().behaviour.tickMs,
      rssMb: +(mem.rss / 1048576).toFixed(1),
      heapMb: +(mem.heapUsed / 1048576).toFixed(1),
      dbBytes: this.db.sizeBytes()
    }
  }
}
