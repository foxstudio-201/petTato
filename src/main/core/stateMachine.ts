import type { PetState, Stats, Emotion, PersonalityProfile, TimeOfDay } from '../../shared/types.js'

/**
 * Behaviour state machine. Rather than hand-wiring every edge, we score the
 * plausible next behaviours from the current situation and sample one. Hard
 * rules (sick / starving / exhausted) short-circuit the scoring so urgent needs
 * always win. Each behaviour carries a goal the movement system fulfils.
 */
export type MoveGoal = 'wander' | 'home' | 'stay'

export interface Behaviour {
  state: PetState
  goal: MoveGoal
  /** How long to stay in this behaviour before re-deciding (ms). */
  durationMs: number
}

export interface DecisionContext {
  stats: Stats
  emotion: Emotion
  timeOfDay: TimeOfDay
  personality: PersonalityProfile
  asleep: boolean
  current: PetState
  rand: () => number
  /** Behaviours forced by an active interaction (eating/playing/talking). */
  locked: boolean
}

function pick(rand: () => number, weighted: [Behaviour, number][]): Behaviour {
  const total = weighted.reduce((a, [, w]) => a + Math.max(0, w), 0)
  let roll = rand() * total
  for (const [b, w] of weighted) {
    roll -= Math.max(0, w)
    if (roll <= 0) return b
  }
  return weighted[0][0]
}

const sec = (n: number) => n * 1000

export function decide(ctx: DecisionContext): Behaviour {
  if (ctx.locked) {
    return { state: ctx.current, goal: 'stay', durationMs: sec(1) }
  }

  const s = ctx.stats
  const p = ctx.personality
  const r = ctx.rand

  // ---- hard overrides ----------------------------------------------------
  if (ctx.asleep) {
    return { state: 'sleeping', goal: 'stay', durationMs: sec(4) }
  }
  if (s.health < 25) {
    return { state: 'sick', goal: 'home', durationMs: sec(6 + r() * 4) }
  }
  if (s.energy < 16 || (ctx.timeOfDay === 'night' && s.energy < 38)) {
    // Tired: head home to sleep.
    return { state: 'returningHome', goal: 'home', durationMs: sec(5) }
  }
  if (s.hunger < 22) {
    return { state: 'hungry', goal: 'stay', durationMs: sec(3 + r() * 3) }
  }

  // ---- weighted ordinary behaviour --------------------------------------
  const activity = p.activityRate * (0.6 + s.energy / 160)
  const explore = p.exploration * (s.curiosity / 100 + 0.2)
  const restful = (1 - s.energy / 100) + (ctx.timeOfDay === 'night' ? 0.6 : 0) + (1 - p.activityRate) * 0.5

  const candidates: [Behaviour, number][] = [
    [{ state: 'idle', goal: 'stay', durationMs: sec(2 + r() * 4) }, 1.2 + restful],
    [{ state: 'walking', goal: 'wander', durationMs: sec(3 + r() * 4) }, 1.5 * activity],
    [{ state: 'running', goal: 'wander', durationMs: sec(2 + r() * 2) }, 0.5 * activity * (s.energy / 100)],
    [{ state: 'exploring', goal: 'wander', durationMs: sec(4 + r() * 5) }, 1.0 * explore],
    [{ state: 'sitting', goal: 'stay', durationMs: sec(4 + r() * 6) }, 1.0 * restful],
    [{ state: 'returningHome', goal: 'home', durationMs: sec(4) }, 0.4 + (1 - p.exploration) * 0.4]
  ]

  // Express dominant emotion occasionally as a short behavioural "tell".
  if (r() < 0.18) {
    const emo = emotionBehaviour(ctx.emotion, r)
    if (emo) candidates.push([emo, 1.4])
  }

  return pick(r, candidates)
}

function emotionBehaviour(emotion: Emotion, r: () => number): Behaviour | null {
  const d = (n: number) => sec(n + r() * 2)
  switch (emotion) {
    case 'happy':
    case 'excited':
      return { state: 'happy', goal: 'stay', durationMs: d(2) }
    case 'sad':
    case 'lonely':
      return { state: 'sad', goal: 'stay', durationMs: d(3) }
    case 'bored':
      return { state: 'bored', goal: 'stay', durationMs: d(2) }
    case 'curious':
      return { state: 'exploring', goal: 'wander', durationMs: d(4) }
    case 'tired':
      return { state: 'sitting', goal: 'stay', durationMs: d(3) }
    default:
      return null
  }
}
