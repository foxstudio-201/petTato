import type { TimeOfDay } from '../../shared/types.js'

/** Map a Date to one of the four day periods used to modulate behaviour. */
export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

/** A 0–1 "energy of the day" curve: high midday, low at night. */
export function daylightFactor(d = new Date()): number {
  const h = d.getHours() + d.getMinutes() / 60
  // cosine bump peaking ~14:00, trough ~02:00
  const phase = ((h - 14) / 24) * Math.PI * 2
  return 0.5 + 0.5 * Math.cos(phase)
}

export function isNight(d = new Date()): boolean {
  return timeOfDay(d) === 'night'
}
