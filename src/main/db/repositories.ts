import { Database } from './database.js'
import type {
  Stats,
  PersonalityProfile,
  PetState,
  MemoryRecord,
  HistoryRecord
} from '../../shared/types.js'

/** Persistent representation of a single pet (one row of `pets`). */
export interface PetRecord {
  id: number
  name: string
  personalityId: string
  personality: PersonalityProfile
  stats: Stats
  state: PetState
  facing: -1 | 1
  posX: number
  posY: number
  homeX: number
  homeY: number
  homeAppearance: string
  asleep: boolean
  bornAt: number
  timeTogetherMs: number
  lastSeen: number
}

function now(): number {
  return Date.now()
}

export class Repositories {
  constructor(private db: Database) {}

  // ---- pets -------------------------------------------------------------
  createPet(p: {
    name: string
    personalityId: string
    personality: PersonalityProfile
    stats: Stats
    homeX: number
    homeY: number
    homeAppearance: string
    posX: number
    posY: number
  }): number {
    const t = now()
    return this.db.insert(
      `INSERT INTO pets
        (name, personality_id, personality_json, stats_json, state, facing,
         pos_x, pos_y, home_x, home_y, home_appearance, asleep,
         born_at, time_together_ms, last_seen, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.name,
        p.personalityId,
        JSON.stringify(p.personality),
        JSON.stringify(p.stats),
        'idle',
        1,
        p.posX,
        p.posY,
        p.homeX,
        p.homeY,
        p.homeAppearance,
        0,
        t,
        0,
        t,
        t,
        t
      ]
    )
  }

  getPet(id: number): PetRecord | undefined {
    const r = this.db.get<any>('SELECT * FROM pets WHERE id = ?', [id])
    return r ? mapPet(r) : undefined
  }

  listPets(): PetRecord[] {
    return this.db.all<any>('SELECT * FROM pets ORDER BY id').map(mapPet)
  }

  savePet(p: PetRecord): void {
    this.db.run(
      `UPDATE pets SET
        name=?, personality_id=?, personality_json=?, stats_json=?, state=?,
        facing=?, pos_x=?, pos_y=?, home_x=?, home_y=?, home_appearance=?,
        asleep=?, time_together_ms=?, last_seen=?, updated_at=?
       WHERE id=?`,
      [
        p.name,
        p.personalityId,
        JSON.stringify(p.personality),
        JSON.stringify(p.stats),
        p.state,
        p.facing,
        p.posX,
        p.posY,
        p.homeX,
        p.homeY,
        p.homeAppearance,
        p.asleep ? 1 : 0,
        Math.round(p.timeTogetherMs),
        p.lastSeen,
        now(),
        p.id
      ]
    )
  }

  deletePet(id: number): void {
    this.db.run('DELETE FROM pets WHERE id = ?', [id])
  }

  // ---- memories ---------------------------------------------------------
  addMemory(petId: number, kind: string, detail: string, weight = 1): number {
    return this.db.insert(
      'INSERT INTO memories (pet_id, kind, detail, weight, created_at) VALUES (?,?,?,?,?)',
      [petId, kind, detail, weight, now()]
    )
  }

  recentMemories(petId: number, limit = 20): MemoryRecord[] {
    return this.db
      .all<any>(
        'SELECT * FROM memories WHERE pet_id=? ORDER BY created_at DESC LIMIT ?',
        [petId, limit]
      )
      .map(mapMemory)
  }

  topMemories(petId: number, kind: string, limit = 5): MemoryRecord[] {
    return this.db
      .all<any>(
        'SELECT * FROM memories WHERE pet_id=? AND kind=? ORDER BY weight DESC, created_at DESC LIMIT ?',
        [petId, kind, limit]
      )
      .map(mapMemory)
  }

  // ---- interactions (for habit detection) -------------------------------
  logInteraction(petId: number, type: string): void {
    const t = now()
    this.db.run('INSERT INTO interactions (pet_id, type, created_at, hour) VALUES (?,?,?,?)', [
      petId,
      type,
      t,
      new Date(t).getHours()
    ])
  }

  interactionCounts(petId: number): Record<string, number> {
    const rows = this.db.all<{ type: string; n: number }>(
      'SELECT type, COUNT(*) AS n FROM interactions WHERE pet_id=? GROUP BY type',
      [petId]
    )
    const out: Record<string, number> = {}
    for (const r of rows) out[r.type] = Number(r.n)
    return out
  }

  /** Hours-of-day at which the user most often interacts (habit/schedule). */
  favouriteHours(petId: number, limit = 3): number[] {
    return this.db
      .all<{ hour: number }>(
        'SELECT hour, COUNT(*) AS n FROM interactions WHERE pet_id=? GROUP BY hour ORDER BY n DESC LIMIT ?',
        [petId, limit]
      )
      .map((r) => Number(r.hour))
  }

  favouriteActivity(petId: number): string | null {
    const r = this.db.get<{ type: string }>(
      `SELECT type FROM interactions WHERE pet_id=? AND type IN ('play','feed','train','gift','pet')
       GROUP BY type ORDER BY COUNT(*) DESC LIMIT 1`,
      [petId]
    )
    return r?.type ?? null
  }

  lastInteractionAt(petId: number): number | null {
    const r = this.db.get<{ t: number }>(
      'SELECT MAX(created_at) AS t FROM interactions WHERE pet_id=?',
      [petId]
    )
    return r?.t ? Number(r.t) : null
  }

  // ---- conversations ----------------------------------------------------
  addConversation(petId: number, role: 'pet' | 'user', text: string): void {
    this.db.run('INSERT INTO conversations (pet_id, role, text, created_at) VALUES (?,?,?,?)', [
      petId,
      role,
      text,
      now()
    ])
  }

  recentConversations(petId: number, limit = 30): { role: string; text: string; createdAt: number }[] {
    return this.db
      .all<any>('SELECT * FROM conversations WHERE pet_id=? ORDER BY created_at DESC LIMIT ?', [
        petId,
        limit
      ])
      .map((r) => ({ role: r.role, text: r.text, createdAt: Number(r.created_at) }))
      .reverse()
  }

  // ---- history ----------------------------------------------------------
  addHistory(petId: number, type: string, payload: unknown): void {
    this.db.run('INSERT INTO history (pet_id, type, payload, created_at) VALUES (?,?,?,?)', [
      petId,
      type,
      JSON.stringify(payload ?? {}),
      now()
    ])
  }

  recentHistory(petId: number, limit = 50): HistoryRecord[] {
    return this.db
      .all<any>('SELECT * FROM history WHERE pet_id=? ORDER BY created_at DESC LIMIT ?', [
        petId,
        limit
      ])
      .map((r) => ({
        id: Number(r.id),
        petId: Number(r.pet_id),
        type: r.type,
        payload: r.payload,
        createdAt: Number(r.created_at)
      }))
  }

  // ---- kv ---------------------------------------------------------------
  kvGet(key: string): string | null {
    const r = this.db.get<{ value: string }>('SELECT value FROM kv WHERE key=?', [key])
    return r?.value ?? null
  }

  kvSet(key: string, value: string): void {
    this.db.run(
      'INSERT INTO kv (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [key, value]
    )
  }
}

function mapPet(r: any): PetRecord {
  return {
    id: Number(r.id),
    name: r.name,
    personalityId: r.personality_id,
    personality: JSON.parse(r.personality_json || '{}'),
    stats: JSON.parse(r.stats_json || '{}'),
    state: r.state,
    facing: r.facing < 0 ? -1 : 1,
    posX: Number(r.pos_x),
    posY: Number(r.pos_y),
    homeX: Number(r.home_x),
    homeY: Number(r.home_y),
    homeAppearance: r.home_appearance,
    asleep: !!r.asleep,
    bornAt: Number(r.born_at),
    timeTogetherMs: Number(r.time_together_ms),
    lastSeen: Number(r.last_seen)
  }
}

function mapMemory(r: any): MemoryRecord {
  return {
    id: Number(r.id),
    petId: Number(r.pet_id),
    kind: r.kind,
    detail: r.detail,
    weight: Number(r.weight),
    createdAt: Number(r.created_at)
  }
}
