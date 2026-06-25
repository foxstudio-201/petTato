import type { Stats, InteractionType } from '../../shared/types.js'

/**
 * Direct interactions and their effects on the stat vector, plus the mini-game
 * generator. Effects are deltas (before the user's reward-scale multiplier is
 * applied) so tuning is centralised and data-driven.
 */
export const INTERACTION_EFFECTS: Record<InteractionType, Partial<Stats>> = {
  feed: { hunger: 35, happiness: 6, energy: 5, health: 3 },
  talk: { social: 28, happiness: 10, curiosity: 6 },
  pet: { happiness: 18, social: 14, comfort: 10 },
  play: { happiness: 22, social: 12, curiosity: 18, energy: -10, hunger: -5 },
  sleep: { energy: 5 }, // the real energy gain comes from the sleeping state over time
  wake: { energy: 0 },
  clean: { cleanliness: 45, comfort: 8, health: 4 },
  gift: { happiness: 25, social: 10, curiosity: 12 },
  train: { curiosity: 20, happiness: 8, energy: -8, health: 2 }
}

export interface MiniGame {
  id: string
  kind: 'math' | 'quiz' | 'memory' | 'puzzle'
  prompt: string
  options: string[]
  answer: string
  reward: Partial<Stats>
}

type Difficulty = 'easy' | 'medium' | 'hard'

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const QUIZ_BANK: { q: string; a: string; wrong: string[] }[] = [
  { q: 'What do plants need to make food?', a: 'Sunlight', wrong: ['Moonlight', 'Pizza', 'Wi-Fi'] },
  { q: 'How many legs does a spider have?', a: '8', wrong: ['6', '4', '10'] },
  { q: 'What is the largest planet?', a: 'Jupiter', wrong: ['Mars', 'Earth', 'Venus'] },
  { q: 'Which animal says "moo"?', a: 'Cow', wrong: ['Cat', 'Duck', 'Frog'] },
  { q: 'What color do you get mixing blue and yellow?', a: 'Green', wrong: ['Purple', 'Orange', 'Pink'] },
  { q: 'How many days are in a week?', a: '7', wrong: ['5', '6', '10'] },
  { q: 'What is frozen water called?', a: 'Ice', wrong: ['Steam', 'Sand', 'Glass'] }
]

let counter = 0
function nextId(): string {
  counter = (counter + 1) % 1_000_000
  return `mg_${Date.now().toString(36)}_${counter}`
}

export function makeMiniGame(difficulty: Difficulty, rand: () => number): MiniGame {
  const kinds: MiniGame['kind'][] = ['math', 'quiz', 'memory', 'puzzle']
  const kind = kinds[Math.floor(rand() * kinds.length)]
  const rewardBase: Partial<Stats> = { happiness: 10, curiosity: 15, social: 8 }

  if (kind === 'math') {
    const max = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 99
    const a = 1 + Math.floor(rand() * max)
    const b = 1 + Math.floor(rand() * max)
    const op = difficulty === 'hard' && rand() < 0.5 ? '×' : '+'
    const answer = op === '×' ? a * b : a + b
    const opts = new Set<number>([answer])
    while (opts.size < 4) opts.add(Math.max(0, answer + Math.floor(rand() * 9) - 4))
    return {
      id: nextId(),
      kind,
      prompt: `What is ${a} ${op} ${b}?`,
      options: shuffle([...opts].map(String), rand),
      answer: String(answer),
      reward: rewardBase
    }
  }

  if (kind === 'memory') {
    const len = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5
    const seq = Array.from({ length: len }, () => 1 + Math.floor(rand() * 9)).join(' ')
    const opts = new Set<string>([seq])
    while (opts.size < 4) {
      opts.add(Array.from({ length: len }, () => 1 + Math.floor(rand() * 9)).join(' '))
    }
    return {
      id: nextId(),
      kind,
      prompt: `Remember this sequence, then pick it: ${seq}`,
      options: shuffle([...opts], rand),
      answer: seq,
      reward: rewardBase
    }
  }

  if (kind === 'puzzle') {
    // Next-number-in-pattern puzzle.
    const start = 1 + Math.floor(rand() * 5)
    const step = (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3) + Math.floor(rand() * 2)
    const seq = [start, start + step, start + step * 2]
    const answer = start + step * 3
    const opts = new Set<number>([answer])
    while (opts.size < 4) opts.add(answer + Math.floor(rand() * 7) - 3)
    return {
      id: nextId(),
      kind,
      prompt: `What comes next? ${seq.join(', ')}, ?`,
      options: shuffle([...opts].map(String), rand),
      answer: String(answer),
      reward: rewardBase
    }
  }

  // quiz
  const item = QUIZ_BANK[Math.floor(rand() * QUIZ_BANK.length)]
  return {
    id: nextId(),
    kind: 'quiz',
    prompt: item.q,
    options: shuffle([item.a, ...item.wrong], rand),
    answer: item.a,
    reward: rewardBase
  }
}
