import type { Stats, InteractionType } from '../../shared/types.js'

/**
 * Direct interactions and their effects on the stat vector, plus the mini-game
 * generator. Effects are deltas (before the user's reward-scale multiplier is
 * applied) so tuning is centralised and data-driven.
 *
 * Mini-games are fully offline and bilingual (English + Vietnamese): the prompt,
 * options and answer are all built in the requested language so the Play tab and
 * the pet's reaction speak the same language the user picked in Settings.
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

export type MiniGameKind = 'math' | 'quiz' | 'memory' | 'puzzle' | 'truefalse' | 'odd' | 'bigger'

export interface MiniGame {
  id: string
  kind: MiniGameKind
  prompt: string
  options: string[]
  answer: string
  reward: Partial<Stats>
}

type Difficulty = 'easy' | 'medium' | 'hard'
type Lang = 'en' | 'vi'

function L(lang: string): Lang {
  return lang === 'vi' ? 'vi' : 'en'
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- localized prompt templates ------------------------------------------
const PROMPTS = {
  en: {
    math: (a: number, op: string, b: number) => `What is ${a} ${op} ${b}?`,
    memory: (seq: string) => `Remember this sequence, then pick it: ${seq}`,
    puzzle: (seq: string) => `What comes next? ${seq}, ?`,
    bigger: 'Which number is bigger?',
    odd: 'Which one does not belong?',
    yes: 'True',
    no: 'False'
  },
  vi: {
    math: (a: number, op: string, b: number) => `${a} ${op} ${b} bằng mấy?`,
    memory: (seq: string) => `Ghi nhớ dãy số này rồi chọn lại: ${seq}`,
    puzzle: (seq: string) => `Số tiếp theo là gì? ${seq}, ?`,
    bigger: 'Số nào lớn hơn?',
    odd: 'Cái nào không cùng nhóm?',
    yes: 'Đúng',
    no: 'Sai'
  }
}

// ---- localized content banks ---------------------------------------------
const QUIZ_BANK: { en: { q: string; a: string; wrong: string[] }; vi: { q: string; a: string; wrong: string[] } }[] = [
  { en: { q: 'What do plants need to make food?', a: 'Sunlight', wrong: ['Moonlight', 'Pizza', 'Wi-Fi'] }, vi: { q: 'Cây cần gì để tạo ra thức ăn?', a: 'Ánh nắng', wrong: ['Ánh trăng', 'Pizza', 'Wi-Fi'] } },
  { en: { q: 'How many legs does a spider have?', a: '8', wrong: ['6', '4', '10'] }, vi: { q: 'Con nhện có mấy chân?', a: '8', wrong: ['6', '4', '10'] } },
  { en: { q: 'What is the largest planet?', a: 'Jupiter', wrong: ['Mars', 'Earth', 'Venus'] }, vi: { q: 'Hành tinh lớn nhất là gì?', a: 'Sao Mộc', wrong: ['Sao Hỏa', 'Trái Đất', 'Sao Kim'] } },
  { en: { q: 'Which animal says "moo"?', a: 'Cow', wrong: ['Cat', 'Duck', 'Frog'] }, vi: { q: 'Con vật nào kêu "ụm bò"?', a: 'Bò', wrong: ['Mèo', 'Vịt', 'Ếch'] } },
  { en: { q: 'What color do you get mixing blue and yellow?', a: 'Green', wrong: ['Purple', 'Orange', 'Pink'] }, vi: { q: 'Trộn xanh dương và vàng ra màu gì?', a: 'Xanh lá', wrong: ['Tím', 'Cam', 'Hồng'] } },
  { en: { q: 'How many days are in a week?', a: '7', wrong: ['5', '6', '10'] }, vi: { q: 'Một tuần có mấy ngày?', a: '7', wrong: ['5', '6', '10'] } },
  { en: { q: 'What is frozen water called?', a: 'Ice', wrong: ['Steam', 'Sand', 'Glass'] }, vi: { q: 'Nước đông cứng lại gọi là gì?', a: 'Nước đá', wrong: ['Hơi nước', 'Cát', 'Thủy tinh'] } },
  { en: { q: 'Which one is a fruit?', a: 'Banana', wrong: ['Carrot', 'Potato', 'Onion'] }, vi: { q: 'Cái nào là trái cây?', a: 'Chuối', wrong: ['Cà rốt', 'Khoai tây', 'Hành'] } },
  { en: { q: 'How many colors are in a rainbow?', a: '7', wrong: ['5', '6', '9'] }, vi: { q: 'Cầu vồng có mấy màu?', a: '7', wrong: ['5', '6', '9'] } }
]

// True/False statements: `t` = is the statement true?
const STATEMENTS: { en: string; vi: string; t: boolean }[] = [
  { en: 'A spider has 8 legs.', vi: 'Con nhện có 8 chân.', t: true },
  { en: 'The sun rises in the west.', vi: 'Mặt trời mọc ở hướng tây.', t: false },
  { en: 'Ice is frozen water.', vi: 'Nước đá là nước đông cứng.', t: true },
  { en: 'A week has 10 days.', vi: 'Một tuần có 10 ngày.', t: false },
  { en: 'Fish can breathe underwater.', vi: 'Cá có thể thở dưới nước.', t: true },
  { en: 'Cats can fly.', vi: 'Mèo có thể bay.', t: false },
  { en: 'Honey is made by bees.', vi: 'Mật ong do ong làm ra.', t: true },
  { en: 'The moon is a star.', vi: 'Mặt trăng là một ngôi sao.', t: false }
]

// Odd-one-out: three members of `group`, one `odd` from a different category.
const CATEGORIES: { en: { group: string[]; odd: string }; vi: { group: string[]; odd: string } }[] = [
  { en: { group: ['Apple', 'Banana', 'Orange'], odd: 'Carrot' }, vi: { group: ['Táo', 'Chuối', 'Cam'], odd: 'Cà rốt' } },
  { en: { group: ['Dog', 'Cat', 'Rabbit'], odd: 'Car' }, vi: { group: ['Chó', 'Mèo', 'Thỏ'], odd: 'Ô tô' } },
  { en: { group: ['Red', 'Blue', 'Green'], odd: 'Table' }, vi: { group: ['Đỏ', 'Xanh dương', 'Xanh lá'], odd: 'Cái bàn' } },
  { en: { group: ['Sun', 'Moon', 'Star'], odd: 'Shoe' }, vi: { group: ['Mặt trời', 'Mặt trăng', 'Ngôi sao'], odd: 'Giày' } },
  { en: { group: ['One', 'Two', 'Three'], odd: 'Dog' }, vi: { group: ['Một', 'Hai', 'Ba'], odd: 'Con chó' } },
  { en: { group: ['Rose', 'Tulip', 'Daisy'], odd: 'Hammer' }, vi: { group: ['Hoa hồng', 'Hoa tulip', 'Hoa cúc'], odd: 'Cái búa' } }
]

let counter = 0
function nextId(): string {
  counter = (counter + 1) % 1_000_000
  return `mg_${Date.now().toString(36)}_${counter}`
}

const KINDS: MiniGameKind[] = ['math', 'quiz', 'memory', 'puzzle', 'truefalse', 'odd', 'bigger']

export function makeMiniGame(difficulty: Difficulty, lang: string, rand: () => number): MiniGame {
  const lg = L(lang)
  const P = PROMPTS[lg]
  const kind = KINDS[Math.floor(rand() * KINDS.length)]
  const rewardBase: Partial<Stats> = { happiness: 10, curiosity: 15, social: 8 }
  const base = { id: nextId(), reward: rewardBase }

  if (kind === 'math') {
    const max = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 99
    const a = 1 + Math.floor(rand() * max)
    const b = 1 + Math.floor(rand() * max)
    const op = difficulty === 'hard' && rand() < 0.5 ? '×' : '+'
    const answer = op === '×' ? a * b : a + b
    const opts = new Set<number>([answer])
    while (opts.size < 4) opts.add(Math.max(0, answer + Math.floor(rand() * 9) - 4))
    return { ...base, kind, prompt: P.math(a, op, b), options: shuffle([...opts].map(String), rand), answer: String(answer) }
  }

  if (kind === 'memory') {
    const len = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5
    const seq = Array.from({ length: len }, () => 1 + Math.floor(rand() * 9)).join(' ')
    const opts = new Set<string>([seq])
    while (opts.size < 4) opts.add(Array.from({ length: len }, () => 1 + Math.floor(rand() * 9)).join(' '))
    return { ...base, kind, prompt: P.memory(seq), options: shuffle([...opts], rand), answer: seq }
  }

  if (kind === 'puzzle') {
    const start = 1 + Math.floor(rand() * 5)
    const step = (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3) + Math.floor(rand() * 2)
    const seq = [start, start + step, start + step * 2]
    const answer = start + step * 3
    const opts = new Set<number>([answer])
    while (opts.size < 4) opts.add(answer + Math.floor(rand() * 7) - 3)
    return { ...base, kind, prompt: P.puzzle(seq.join(', ')), options: shuffle([...opts].map(String), rand), answer: String(answer) }
  }

  if (kind === 'bigger') {
    const max = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 100 : 999
    const nums = new Set<number>()
    while (nums.size < 4) nums.add(1 + Math.floor(rand() * max))
    const arr = [...nums]
    const answer = Math.max(...arr)
    return { ...base, kind, prompt: P.bigger, options: shuffle(arr.map(String), rand), answer: String(answer) }
  }

  if (kind === 'truefalse') {
    const s = STATEMENTS[Math.floor(rand() * STATEMENTS.length)]
    return { ...base, kind, prompt: s[lg], options: [P.yes, P.no], answer: s.t ? P.yes : P.no }
  }

  if (kind === 'odd') {
    const item = CATEGORIES[Math.floor(rand() * CATEGORIES.length)][lg]
    return { ...base, kind, prompt: P.odd, options: shuffle([...item.group, item.odd], rand), answer: item.odd }
  }

  // quiz
  const item = QUIZ_BANK[Math.floor(rand() * QUIZ_BANK.length)][lg]
  return { ...base, kind: 'quiz', prompt: item.q, options: shuffle([item.a, ...item.wrong], rand), answer: item.a }
}

// ---- localized reaction lines for the Play result ------------------------
const MINIGAME_LINES = {
  en: {
    win: ['Yay, correct! That was fun!', 'Nailed it! You are clever!', 'Woohoo, right again!', 'Great job — that was easy for you!'],
    lose: (ans: string) => `Aw, not quite — it was "${ans}". Let's try again sometime!`,
    expired: 'Hmm, that game already ended!'
  },
  vi: {
    win: ['Đúng rồi, vui ghê!', 'Chuẩn luôn! Cậu giỏi quá!', 'Woohoo, lại đúng nữa rồi!', 'Tuyệt vời — dễ với cậu mà!'],
    lose: (ans: string) => `Ơ, chưa đúng — đáp án là "${ans}". Lần sau thử lại nhé!`,
    expired: 'Ơ, ván này kết thúc mất rồi!'
  }
}

export function miniGameWinLine(lang: string, rand: () => number): string {
  const pool = MINIGAME_LINES[L(lang)].win
  return pool[Math.floor(rand() * pool.length)] ?? pool[0]
}

export function miniGameLoseLine(lang: string, answer: string): string {
  return MINIGAME_LINES[L(lang)].lose(answer)
}

export function miniGameExpiredLine(lang: string): string {
  return MINIGAME_LINES[L(lang)].expired
}
