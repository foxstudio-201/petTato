import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { paths } from './paths.js'
import { log } from './logger.js'
import type { AppConfig } from '../shared/types.js'

const SCHEMA_VERSION = 1

export const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: SCHEMA_VERSION,
  language: 'en',
  onboarded: false,
  ownerName: '',
  pet: { activePetId: 1 },
  voice: {
    enabled: false,
    recognitionLang: 'en-US',
    allowAppLaunch: true
  },
  appearance: {
    scale: 1.0,
    opacity: 1.0,
    spritePack: 'default',
    houseAppearance: 'cottage',
    animationSpeed: 1.0
  },
  behaviour: {
    speechFrequency: 0.5,
    activityFrequency: 0.5,
    tickMs: 1000,
    freeRoam: false
  },
  interaction: {
    quizDifficulty: 'easy',
    rewardScale: 1.0,
    notificationsEnabled: true
  },
  window: {
    alwaysOnTop: true,
    clickThrough: false,
    followCursor: false,
    startMonitor: 0
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    uiScale: 1.0
  },
  system: {
    autostart: false,
    apiPort: 3577,
    autosaveSeconds: 30
  }
}

/** Deep-merge persisted config over defaults so new keys are always present. */
function merge<T>(base: T, over: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base }
  for (const key of Object.keys(over ?? {}) as (keyof T)[]) {
    const bv = (base as any)[key]
    const ov = (over as any)[key]
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && bv && typeof bv === 'object') {
      out[key] = merge(bv, ov)
    } else if (ov !== undefined) {
      out[key] = ov
    }
  }
  return out
}

export class ConfigStore {
  private data: AppConfig

  constructor() {
    this.data = this.load()
  }

  private load(): AppConfig {
    try {
      if (existsSync(paths.config())) {
        const raw = JSON.parse(readFileSync(paths.config(), 'utf-8'))
        return merge(DEFAULT_CONFIG, raw)
      }
    } catch (e) {
      log.error('Failed to read config, using defaults:', e)
    }
    const fresh = merge(DEFAULT_CONFIG, {})
    this.persist(fresh)
    return fresh
  }

  private persist(data: AppConfig): void {
    paths.configDir()
    writeFileSync(paths.config(), JSON.stringify(data, null, 2))
  }

  get(): AppConfig {
    return this.data
  }

  /** Apply a partial patch (deep-merged), persist, and return the new config. */
  update(patch: Partial<AppConfig>): AppConfig {
    this.data = merge(this.data, patch)
    this.persist(this.data)
    return this.data
  }

  replace(next: AppConfig): AppConfig {
    this.data = merge(DEFAULT_CONFIG, next)
    this.persist(this.data)
    return this.data
  }
}
