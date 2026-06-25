import type { Vec2, PersonalityProfile, PetState } from '../../shared/types.js'

/**
 * Desktop movement model. The pet lives on a "ground line" near the bottom of
 * the active monitor (Shimeji-style) and walks/runs horizontally, occasionally
 * hopping. The engine owns position/target; these helpers compute goals and
 * integrate motion. All values are screen pixels.
 */
export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface MoveResult {
  pos: Vec2
  facing: -1 | 1
  arrived: boolean
}

const PET_FOOTPRINT = 96 // logical px reserved at the pet's feet

export function groundY(bounds: ScreenBounds): number {
  return bounds.y + bounds.height - PET_FOOTPRINT
}

export function clampToBounds(p: Vec2, bounds: ScreenBounds, freeRoam = false): Vec2 {
  const minX = bounds.x + 8
  const maxX = bounds.x + bounds.width - PET_FOOTPRINT - 8
  const x = Math.max(minX, Math.min(maxX, p.x))
  if (!freeRoam) return { x, y: groundY(bounds) }
  const minY = bounds.y + 8
  const maxY = bounds.y + bounds.height - PET_FOOTPRINT - 8
  return { x, y: Math.max(minY, Math.min(maxY, p.y)) }
}

/** Speed (px/sec) for the current locomotion state, scaled by personality. */
export function speedFor(state: PetState, p: PersonalityProfile): number {
  const base =
    state === 'running' ? 220 : state === 'exploring' ? 130 : state === 'returningHome' ? 150 : 70
  return base * (0.7 + p.activityRate * 0.3)
}

/** Pick a wander target: a random horizontal point, biased by exploration. */
export function pickWanderTarget(
  current: Vec2,
  bounds: ScreenBounds,
  p: PersonalityProfile,
  rand: () => number,
  freeRoam = false
): Vec2 {
  const range = bounds.width * (0.25 + p.exploration * 0.35)
  const dir = rand() < 0.5 ? -1 : 1
  const dist = range * (0.3 + rand() * 0.7)
  const y = freeRoam
    ? bounds.y + 20 + rand() * (bounds.height - PET_FOOTPRINT - 40)
    : current.y
  return clampToBounds({ x: current.x + dir * dist, y }, bounds, freeRoam)
}

export function homeTarget(home: Vec2, bounds: ScreenBounds): Vec2 {
  return clampToBounds({ x: home.x, y: home.y }, bounds)
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Integrate one step toward target in 2D. dtMs is elapsed time for this frame. */
export function stepToward(pos: Vec2, target: Vec2, speedPxSec: number, dtMs: number): MoveResult {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const dist = Math.hypot(dx, dy)
  const step = (speedPxSec * dtMs) / 1000
  const facing: -1 | 1 = dx < -0.5 ? -1 : 1
  if (dist <= step || dist < 1) {
    return { pos: { x: target.x, y: target.y }, facing, arrived: true }
  }
  return {
    pos: { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step },
    facing,
    arrived: false
  }
}
