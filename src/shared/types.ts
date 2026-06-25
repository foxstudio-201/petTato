/**
 * Shared type definitions used across the Electron main process, the preload
 * bridge, the Svelte renderers and the local HTTP API. Keeping these in one
 * place guarantees the simulation backend and every UI surface agree on shape.
 */

/** The eight continuously-evolving needs that drive the simulation. */
export const STAT_KEYS = [
  'hunger',
  'energy',
  'happiness',
  'social',
  'health',
  'comfort',
  'cleanliness',
  'curiosity'
] as const
export type StatKey = (typeof STAT_KEYS)[number]
export type Stats = Record<StatKey, number>

/** Discrete emotional states derived from the stat vector + history. */
export type Emotion =
  | 'happy'
  | 'sad'
  | 'excited'
  | 'lonely'
  | 'tired'
  | 'hungry'
  | 'curious'
  | 'relaxed'
  | 'bored'
  | 'sick'

export const EMOTIONS: Emotion[] = [
  'happy', 'sad', 'excited', 'lonely', 'tired',
  'hungry', 'curious', 'relaxed', 'bored', 'sick'
]

/** Behaviour state-machine nodes. Drives animation + window movement. */
export type PetState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'sitting'
  | 'sleeping'
  | 'playing'
  | 'talking'
  | 'exploring'
  | 'returningHome'
  | 'eating'
  | 'happy'
  | 'sad'
  | 'hungry'
  | 'bored'
  | 'sick'

export const PET_STATES: PetState[] = [
  'idle', 'walking', 'running', 'sitting', 'sleeping', 'playing', 'talking',
  'exploring', 'returningHome', 'eating', 'happy', 'sad', 'hungry', 'bored', 'sick'
]

/** Built-in personality archetypes. */
export type PersonalityId =
  | 'friendly'
  | 'energetic'
  | 'lazy'
  | 'shy'
  | 'curious'
  | 'mischievous'
  | 'calm'
  | 'cheerful'

export interface PersonalityProfile {
  id: string
  name: string
  /** Multiplier on how often the pet picks an active behaviour (0.5–1.5). */
  activityRate: number
  /** Multiplier on happiness decay (lower = more content). */
  happinessDecay: number
  /** Multiplier on social need growth (higher = needs more attention). */
  socialNeed: number
  /** Multiplier on curiosity growth / urge to explore. */
  exploration: number
  /** How readily the pet starts conversations on its own (0–1). */
  talkativeness: number
  /** Tone tag used to pick dialogue variants. */
  tone: 'warm' | 'hyper' | 'sleepy' | 'timid' | 'inquisitive' | 'playful' | 'serene' | 'sunny'
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface Vec2 {
  x: number
  y: number
}

export interface HomeInfo {
  x: number
  y: number
  appearance: string
}

/** A full immutable snapshot of the pet broadcast to every UI surface. */
export interface PetSnapshot {
  id: number
  name: string
  personality: PersonalityProfile
  stats: Stats
  emotion: Emotion
  /** Secondary emotions with intensity, for nuanced UIs. */
  emotionScores: Partial<Record<Emotion, number>>
  state: PetState
  /** Direction the sprite faces: -1 = left, 1 = right. */
  facing: -1 | 1
  position: Vec2
  target: Vec2
  home: HomeInfo
  timeOfDay: TimeOfDay
  /** Current speech bubble text, or null. */
  speech: string | null
  /** ms timestamp the pet was born / created. */
  bornAt: number
  /** Total ms the user has spent with the pet. */
  timeTogetherMs: number
  ageDays: number
  /** True while asleep (manual or auto). */
  asleep: boolean
}

export type InteractionType =
  | 'feed'
  | 'talk'
  | 'pet'
  | 'play'
  | 'sleep'
  | 'wake'
  | 'clean'
  | 'gift'
  | 'train'

export interface MemoryRecord {
  id: number
  petId: number
  kind: string
  detail: string
  weight: number
  createdAt: number
}

export interface HistoryRecord {
  id: number
  petId: number
  type: string
  payload: string
  createdAt: number
}

export interface DialogueLine {
  text: string
  /** Optional multiple-choice the user can answer (used by mini-games). */
  options?: string[]
  /** Tag identifying which engine subsystem produced the line. */
  source: string
}

/** Settings persisted in JSON config (appearance, behaviour tuning, OS flags). */
export interface AppConfig {
  schemaVersion: number
  /** UI + voice language code (e.g. 'en', 'vi'). */
  language: string
  /** Whether the first-run setup wizard has been completed. */
  onboarded: boolean
  /** The user's name — the pet uses it in dialogue. */
  ownerName: string
  pet: {
    activePetId: number
  }
  voice: {
    enabled: boolean
    /** BCP-47 locale for speech recognition, e.g. 'en-US', 'vi-VN'. */
    recognitionLang: string
    /** Allow voice commands to launch other desktop applications. */
    allowAppLaunch: boolean
  }
  appearance: {
    scale: number
    opacity: number
    spritePack: string
    houseAppearance: string
    animationSpeed: number
  }
  behaviour: {
    speechFrequency: number // 0–1
    activityFrequency: number // 0–1
    tickMs: number
    /** When true the pet roams the whole screen, not just the ground line. */
    freeRoam: boolean
  }
  interaction: {
    quizDifficulty: 'easy' | 'medium' | 'hard'
    rewardScale: number
    notificationsEnabled: boolean
  }
  window: {
    alwaysOnTop: boolean
    clickThrough: boolean
    followCursor: boolean
    startMonitor: number
  }
  accessibility: {
    reducedMotion: boolean
    highContrast: boolean
    uiScale: number
  }
  system: {
    autostart: boolean
    apiPort: number
    autosaveSeconds: number
  }
}

export interface PerfMetrics {
  uptimeMs: number
  ticks: number
  tickMs: number
  rssMb: number
  heapMb: number
  dbBytes: number
}
