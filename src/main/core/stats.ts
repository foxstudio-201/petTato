import type { Stats, StatKey, PersonalityProfile } from '../../shared/types.js'
import { STAT_KEYS } from '../../shared/types.js'

/**
 * Continuous needs model. Every stat is on a 0–100 scale where **higher is
 * always better** (100 = fully satisfied). Decay is expressed per minute and
 * scaled by the elapsed time so the exact same code drives both live ticks and
 * offline progression.
 */

/** Baseline per-minute change at neutral conditions while awake. */
const BASE_RATE: Record<StatKey, number> = {
  hunger: -0.7,
  energy: -0.5,
  happiness: -0.3,
  social: -0.4,
  health: -0.04,
  comfort: -0.2,
  cleanliness: -0.25,
  curiosity: -0.4
}

export function defaultStats(): Stats {
  return {
    hunger: 80,
    energy: 80,
    happiness: 75,
    social: 70,
    health: 90,
    comfort: 75,
    cleanliness: 85,
    curiosity: 60
  }
}

export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, v))
}

export function clampStats(s: Stats): Stats {
  const out = {} as Stats
  for (const k of STAT_KEYS) out[k] = clampStat(s[k] ?? 50)
  return out
}

export interface DecayContext {
  elapsedMs: number
  asleep: boolean
  personality: PersonalityProfile
  daylight: number // 0–1
  nearHome: boolean
}

/**
 * Apply time-based decay + cross-stat effects. Pure: returns a fresh object.
 * For very long offline gaps the elapsed time is damped so a pet left for a
 * week is hungry/lonely but never "dead".
 */
export function applyDecay(stats: Stats, ctx: DecayContext): Stats {
  const elapsedMin = Math.min(ctx.elapsedMs / 60000, 60 * 24 * 7) // hard cap 7 days
  // Diminishing returns past ~12h so long absences plateau instead of zeroing.
  const effectiveMin = elapsedMin <= 720 ? elapsedMin : 720 + Math.sqrt(elapsedMin - 720) * 6

  const p = ctx.personality
  const s: Stats = { ...stats }

  for (const k of STAT_KEYS) {
    let rate = BASE_RATE[k]

    if (k === 'energy') {
      // Sleeping recovers energy; activity at midday costs a little more.
      rate = ctx.asleep ? 2.6 : -0.5 - (1 - ctx.daylight) * 0.15
    }
    if (k === 'happiness') {
      rate *= p.happinessDecay
    }
    if (k === 'social') {
      rate *= p.socialNeed
    }
    if (k === 'curiosity') {
      // Personalities that love exploring get bored (lose stimulation) faster.
      rate *= 0.7 + p.exploration * 0.3
    }
    if (k === 'comfort') {
      // Drift toward a baseline that is higher near home, lower away at night.
      const target = ctx.nearHome ? 78 : 55 - (1 - ctx.daylight) * 10
      const drift = (target - s[k]) * 0.02 * effectiveMin
      s[k] = clampStat(s[k] + drift)
      continue
    }

    s[k] = clampStat(s[k] + rate * effectiveMin)
  }

  // ---- cross-stat effects (computed after primary decay) -----------------
  const neglect = (100 - s.hunger) * 0.4 + (100 - s.cleanliness) * 0.25 + (100 - s.comfort) * 0.15
  // Health slowly erodes when core needs are neglected, recovers when cared for.
  const healthPull = neglect > 45 ? -(neglect - 45) * 0.01 : (s.hunger > 60 && s.cleanliness > 60 ? 0.05 : 0)
  s.health = clampStat(s.health + healthPull * effectiveMin)

  // Happiness is dragged down by the worst unmet needs.
  const worst = Math.min(s.hunger, s.social, s.comfort, s.cleanliness)
  if (worst < 35) {
    s.happiness = clampStat(s.happiness - (35 - worst) * 0.01 * effectiveMin)
  }

  return s
}

/** Add deltas to stats with clamping (used by interactions/rewards). */
export function applyDelta(stats: Stats, delta: Partial<Stats>, scale = 1): Stats {
  const s: Stats = { ...stats }
  for (const k of STAT_KEYS) {
    if (delta[k] !== undefined) s[k] = clampStat(s[k] + (delta[k] as number) * scale)
  }
  return s
}

/** Overall wellbeing 0–100 — a weighted blend used for mood/health display. */
export function wellbeing(s: Stats): number {
  return Math.round(
    s.happiness * 0.3 +
      s.health * 0.2 +
      s.hunger * 0.15 +
      s.social * 0.12 +
      s.energy * 0.1 +
      s.comfort * 0.06 +
      s.cleanliness * 0.04 +
      s.curiosity * 0.03
  )
}
