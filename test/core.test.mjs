import { test } from 'node:test'
import assert from 'node:assert/strict'

// These modules import only types from shared/* (stripped at runtime), so they
// load directly under Node's built-in TypeScript support.
import { timeOfDay, daylightFactor } from '../src/main/core/time.ts'
import { scoreEmotions, dominantEmotion } from '../src/main/core/emotions.ts'
import { makeMiniGame } from '../src/main/core/interactions.ts'
import { decide } from '../src/main/core/stateMachine.ts'
import { getPersonality, listPersonalities } from '../src/main/core/personality.ts'
import { stepToward, pickWanderTarget } from '../src/main/core/movement.ts'
import { DialogueEngine } from '../src/main/core/dialogue.ts'
import { buildPack } from '../src/main/assets/spritegen.ts'

const STATS = {
  hunger: 80,
  energy: 70,
  happiness: 75,
  social: 60,
  health: 90,
  comfort: 70,
  cleanliness: 80,
  curiosity: 50
}

test('timeOfDay returns a valid period', () => {
  assert.ok(['morning', 'afternoon', 'evening', 'night'].includes(timeOfDay()))
  const d = daylightFactor()
  assert.ok(d >= 0 && d <= 1)
})

test('emotions: starving pet is hungry', () => {
  const emo = dominantEmotion({ stats: { ...STATS, hunger: 5 }, timeOfDay: 'afternoon', asleep: false })
  assert.equal(emo, 'hungry')
})

test('emotions: happy when content', () => {
  const scores = scoreEmotions({ stats: { ...STATS, happiness: 95, social: 90 }, timeOfDay: 'afternoon', asleep: false })
  assert.ok(scores.happy > scores.sad)
})

test('minigame has a correct answer among its options', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const g = makeMiniGame(diff, Math.random)
    assert.ok(g.options.includes(g.answer), `answer present for ${diff} ${g.kind}`)
    assert.ok(g.options.length >= 2)
  }
})

test('state machine returns a behaviour', () => {
  const b = decide({
    stats: STATS,
    emotion: 'happy',
    timeOfDay: 'afternoon',
    personality: getPersonality('energetic'),
    asleep: false,
    current: 'idle',
    rand: Math.random,
    locked: false
  })
  assert.ok(b.state && b.goal && b.durationMs > 0)
})

test('exhausted pet heads home or sleeps', () => {
  const b = decide({
    stats: { ...STATS, energy: 5 },
    emotion: 'tired',
    timeOfDay: 'night',
    personality: getPersonality('calm'),
    asleep: false,
    current: 'idle',
    rand: () => 0.5,
    locked: false
  })
  assert.ok(['returningHome', 'sleeping', 'sick', 'hungry'].includes(b.state))
})

test('personalities: 8 built-ins present', () => {
  assert.ok(listPersonalities().length >= 8)
})

test('movement: stepToward arrives and faces correctly', () => {
  const res = stepToward({ x: 0, y: 100 }, { x: 5, y: 100 }, 1000, 1000)
  assert.equal(res.arrived, true)
  assert.equal(res.facing, 1)
  const left = stepToward({ x: 100, y: 0 }, { x: 0, y: 0 }, 10, 1000)
  assert.equal(left.facing, -1)
})

test('movement: wander target stays in bounds', () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 800 }
  for (let i = 0; i < 50; i++) {
    const t = pickWanderTarget({ x: 500, y: 700 }, bounds, getPersonality('curious'), Math.random)
    assert.ok(t.x >= 0 && t.x <= 1000)
  }
})

test('dialogue: responder reacts to greetings', () => {
  const d = new DialogueEngine()
  const ctx = {
    name: 'Tato',
    emotion: 'happy',
    stats: STATS,
    timeOfDay: 'morning',
    tone: 'warm',
    favouriteActivity: 'play',
    favouriteHours: [9],
    minutesSinceLastVisit: 10,
    ageDays: 1,
    hoursTogether: 2,
    rand: Math.random
  }
  const line = d.respond('hello there', ctx)
  assert.ok(typeof line.text === 'string' && line.text.length > 0)
})

test('asset generator produces PNG sheets + manifest', () => {
  const { files, manifest } = buildPack('default', 'cottage')
  assert.ok(manifest.animations.idle.frames > 0)
  assert.ok(files['idle.png'][0] === 0x89 && files['idle.png'][1] === 0x50) // PNG magic
  assert.ok(files['house.png'] && files['icon.png'])
})
