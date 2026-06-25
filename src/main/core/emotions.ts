import type { Stats, Emotion, TimeOfDay } from '../../shared/types.js'

/**
 * Emotion engine. Emotions are *derived* from the stat vector + time of day,
 * producing a score per emotion. The dominant score becomes the pet's mood and
 * the full vector lets UIs show nuance. Emotions therefore evolve naturally as
 * stats drift — no separate emotion state to keep in sync.
 */
export interface EmotionContext {
  stats: Stats
  timeOfDay: TimeOfDay
  asleep: boolean
}

export function scoreEmotions(ctx: EmotionContext): Record<Emotion, number> {
  const s = ctx.stats
  const inv = (v: number) => 100 - v

  const scores: Record<Emotion, number> = {
    happy: s.happiness * 0.7 + s.social * 0.15 + s.health * 0.15,
    sad: inv(s.happiness) * 0.6 + inv(s.social) * 0.2 + inv(s.health) * 0.2,
    excited: s.energy * 0.4 + s.happiness * 0.3 + s.curiosity * 0.3,
    lonely: inv(s.social) * 0.85 + inv(s.happiness) * 0.15,
    tired: inv(s.energy) * 0.9 + (ctx.timeOfDay === 'night' ? 15 : 0),
    hungry: inv(s.hunger) * 0.95,
    curious: s.curiosity * 0.8 + s.energy * 0.2,
    relaxed: s.comfort * 0.5 + s.health * 0.25 + (s.happiness > 50 ? 20 : 0),
    bored: inv(s.curiosity) * 0.6 + inv(s.happiness) * 0.2 + inv(s.social) * 0.2,
    sick: inv(s.health) * 0.9 + inv(s.cleanliness) * 0.1
  }

  // Time-of-day modulation.
  if (ctx.timeOfDay === 'night') {
    scores.tired += 10
    scores.relaxed += 5
    scores.excited -= 10
  }
  if (ctx.timeOfDay === 'morning') {
    scores.excited += 6
    scores.curious += 6
  }

  for (const k of Object.keys(scores) as Emotion[]) {
    scores[k] = Math.max(0, Math.min(100, scores[k]))
  }
  return scores
}

/** Pick the dominant emotion, with hard overrides for urgent needs. */
export function dominantEmotion(ctx: EmotionContext): Emotion {
  const s = ctx.stats
  // Urgent physiological states win regardless of blended scores.
  if (s.health < 25) return 'sick'
  if (s.hunger < 20) return 'hungry'
  if (s.energy < 18 && !ctx.asleep) return 'tired'

  const scores = scoreEmotions(ctx)
  let best: Emotion = 'relaxed'
  let bestVal = -Infinity
  for (const k of Object.keys(scores) as Emotion[]) {
    if (scores[k] > bestVal) {
      bestVal = scores[k]
      best = k
    }
  }
  return best
}

/** Top-N emotion scores for nuanced UI display. */
export function topEmotions(ctx: EmotionContext, n = 3): Partial<Record<Emotion, number>> {
  const scores = scoreEmotions(ctx)
  const sorted = (Object.entries(scores) as [Emotion, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
  const out: Partial<Record<Emotion, number>> = {}
  for (const [k, v] of sorted) out[k] = Math.round(v)
  return out
}
