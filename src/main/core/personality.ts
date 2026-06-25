import type { PersonalityProfile } from '../../shared/types.js'

/**
 * Built-in personality archetypes. Each is a set of multipliers/weights that
 * the rest of the engine reads — keeping personality fully data-driven means a
 * mod (or the user) can add new ones without touching engine code.
 */
export const BUILTIN_PERSONALITIES: Record<string, PersonalityProfile> = {
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    activityRate: 1.0,
    happinessDecay: 0.9,
    socialNeed: 1.1,
    exploration: 1.0,
    talkativeness: 0.7,
    tone: 'warm'
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic',
    activityRate: 1.5,
    happinessDecay: 1.0,
    socialNeed: 1.0,
    exploration: 1.4,
    talkativeness: 0.8,
    tone: 'hyper'
  },
  lazy: {
    id: 'lazy',
    name: 'Lazy',
    activityRate: 0.5,
    happinessDecay: 0.8,
    socialNeed: 0.7,
    exploration: 0.5,
    talkativeness: 0.4,
    tone: 'sleepy'
  },
  shy: {
    id: 'shy',
    name: 'Shy',
    activityRate: 0.8,
    happinessDecay: 1.0,
    socialNeed: 1.3,
    exploration: 0.7,
    talkativeness: 0.3,
    tone: 'timid'
  },
  curious: {
    id: 'curious',
    name: 'Curious',
    activityRate: 1.2,
    happinessDecay: 0.95,
    socialNeed: 0.9,
    exploration: 1.6,
    talkativeness: 0.7,
    tone: 'inquisitive'
  },
  mischievous: {
    id: 'mischievous',
    name: 'Mischievous',
    activityRate: 1.3,
    happinessDecay: 1.0,
    socialNeed: 1.0,
    exploration: 1.3,
    talkativeness: 0.9,
    tone: 'playful'
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    activityRate: 0.7,
    happinessDecay: 0.75,
    socialNeed: 0.8,
    exploration: 0.8,
    talkativeness: 0.5,
    tone: 'serene'
  },
  cheerful: {
    id: 'cheerful',
    name: 'Cheerful',
    activityRate: 1.1,
    happinessDecay: 0.7,
    socialNeed: 1.0,
    exploration: 1.0,
    talkativeness: 0.85,
    tone: 'sunny'
  }
}

/** Custom personalities contributed by mods or the user (merged at runtime). */
const CUSTOM_PERSONALITIES: Record<string, PersonalityProfile> = {}

const PERSONALITY_DEFAULTS: Omit<PersonalityProfile, 'id' | 'name'> = {
  activityRate: 1,
  happinessDecay: 1,
  socialNeed: 1,
  exploration: 1,
  talkativeness: 0.6,
  tone: 'warm'
}

export function registerPersonality(p: PersonalityProfile): void {
  if (!p || !p.id) return
  CUSTOM_PERSONALITIES[p.id] = { ...PERSONALITY_DEFAULTS, ...p }
}

export function getPersonality(id: string): PersonalityProfile {
  return CUSTOM_PERSONALITIES[id] ?? BUILTIN_PERSONALITIES[id] ?? BUILTIN_PERSONALITIES.friendly
}

export function listPersonalities(): PersonalityProfile[] {
  return [...Object.values(BUILTIN_PERSONALITIES), ...Object.values(CUSTOM_PERSONALITIES)]
}
