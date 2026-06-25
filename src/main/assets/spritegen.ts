import { PNG } from 'pngjs'

/**
 * Procedural sprite generator. Draws "Tato", a round blob companion, frame by
 * frame into horizontal sprite-strip PNGs — plus a house, an app icon and a
 * tray icon. Everything is generated from code, so the app ships with zero
 * binary art assets and can regenerate them on any machine, offline.
 *
 * This module is intentionally dependency-light (only pngjs) and free of
 * Electron imports so it can run both inside the app (first-launch generation)
 * and from the standalone `scripts/generate-assets.mjs` regeneration tool.
 */

export const FRAME = 80
export type RGBA = [number, number, number, number]
export type RGB = [number, number, number]

type Mouth = 'smile' | 'bigsmile' | 'frown' | 'flat' | 'open' | 'sick' | 'tongue'

interface FrameSpec {
  bob: number
  squash: number
  blink: boolean
  mouth: Mouth
  legPhase: number
  extras: string[]
  tint: RGB
  dim: number
}

export interface PackManifest {
  version: number
  name: string
  title?: string
  frameWidth: number
  frameHeight: number
  animations: Record<string, { file: string; frames: number; fps: number; loop: boolean }>
  house: string
  icon: string
}

// ---- low level raster helpers -------------------------------------------
class Canvas {
  png: PNG
  w: number
  h: number
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.png = new PNG({ width: w, height: h })
    this.png.data.fill(0)
  }
  px(x: number, y: number, c: RGBA): void {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    const a = c[3] / 255
    const d = this.png.data
    d[i] = Math.round(c[0] * a + d[i] * (1 - a))
    d[i + 1] = Math.round(c[1] * a + d[i + 1] * (1 - a))
    d[i + 2] = Math.round(c[2] * a + d[i + 2] * (1 - a))
    d[i + 3] = Math.min(255, d[i + 3] + c[3])
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) this.px(x, y, c)
      }
    }
  }
  ring(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      this.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c)
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c)
  }
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGBA): void {
    const minY = Math.floor(Math.min(y1, y2, y3))
    const maxY = Math.ceil(Math.max(y1, y2, y3))
    const minX = Math.floor(Math.min(x1, x2, x3))
    const maxX = Math.ceil(Math.max(x1, x2, x3))
    const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)
    if (area === 0) return
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w1 = ((x2 - x1) * (y - y1) - (x - x1) * (y2 - y1)) / area
        const w2 = ((x - x1) * (y3 - y1) - (x3 - x1) * (y - y1)) / area
        const w0 = 1 - w1 - w2
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.px(x, y, c)
      }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    while (true) {
      this.px(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x0 += sx
      }
      if (e2 < dx) {
        err += dx
        y0 += sy
      }
    }
  }
  blit(src: Canvas, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4
        const a = src.png.data[i + 3]
        if (a > 0) this.px(ox + x, oy + y, [src.png.data[i], src.png.data[i + 1], src.png.data[i + 2], a])
      }
  }
  buffer(): Buffer {
    return PNG.sync.write(this.png)
  }
}

function tinted(base: RGB, t: RGB, dim: number): RGBA {
  return [
    Math.round(base[0] * (t[0] / 255) * dim),
    Math.round(base[1] * (t[1] / 255) * dim),
    Math.round(base[2] * (t[2] / 255) * dim),
    255
  ]
}

// ---- species ------------------------------------------------------------
const EYE: RGB = [40, 44, 52]
const WHITE: RGB = [255, 255, 255]
const CHEEK: RGB = [255, 150, 160]

export type BodyShape = 'blob' | 'round' | 'slime' | 'ghost' | 'tall'
export type EarStyle = 'sprout' | 'cat' | 'bunny' | 'fox' | 'floppy' | 'none'

export interface Species {
  id: string
  name: string
  body: RGB
  bodyDark: RGB
  belly: RGB
  shape: BodyShape
  ears: EarStyle
  /** Accent colour for ears/sprout/inner details. */
  accent: RGB
  /** Larger anime-style eyes with extra shine. */
  bigEyes?: boolean
}

export const SPECIES: Record<string, Species> = {
  tato: { id: 'tato', name: 'Tato (Blob)', body: [95, 198, 176], bodyDark: [54, 140, 124], belly: [201, 240, 224], shape: 'blob', ears: 'sprout', accent: [120, 210, 120] },
  aria: { id: 'aria', name: 'Aria (Anime)', body: [255, 214, 236], bodyDark: [220, 160, 200], belly: [255, 240, 250], shape: 'round', ears: 'none', accent: [180, 130, 255], bigEyes: true },
  mochi: { id: 'mochi', name: 'Mochi (Cat)', body: [255, 196, 214], bodyDark: [214, 142, 168], belly: [255, 232, 240], shape: 'round', ears: 'cat', accent: [120, 90, 110] },
  pup: { id: 'pup', name: 'Pup (Dog)', body: [216, 178, 130], bodyDark: [168, 130, 86], belly: [244, 224, 190], shape: 'round', ears: 'floppy', accent: [110, 78, 50] },
  pebble: { id: 'pebble', name: 'Pebble (Bunny)', body: [173, 196, 255], bodyDark: [120, 146, 214], belly: [224, 233, 255], shape: 'round', ears: 'bunny', accent: [255, 180, 200] },
  jelly: { id: 'jelly', name: 'Jelly (Slime)', body: [150, 226, 168], bodyDark: [96, 176, 120], belly: [214, 248, 222], shape: 'slime', ears: 'none', accent: [120, 200, 140] },
  wisp: { id: 'wisp', name: 'Wisp (Ghost)', body: [201, 196, 255], bodyDark: [154, 146, 220], belly: [232, 230, 255], shape: 'ghost', ears: 'none', accent: [180, 170, 255], bigEyes: true },
  ember: { id: 'ember', name: 'Ember (Fox)', body: [255, 176, 120], bodyDark: [214, 130, 78], belly: [255, 226, 196], shape: 'tall', ears: 'fox', accent: [120, 70, 50] }
}

export function listSpecies(): Species[] {
  return Object.values(SPECIES)
}

function drawEars(c: Canvas, sp: Species, bcx: number, bcy: number, rx: number, ry: number, dark: RGBA, accent: RGBA): void {
  const topY = bcy - ry
  const ex = rx * 0.62
  switch (sp.ears) {
    case 'sprout':
      c.line(bcx, topY, bcx, topY - 7, dark)
      c.ellipse(bcx + 3, topY - 7, 4, 2, accent)
      break
    case 'cat':
      c.triangle(bcx - ex - 4, topY + 6, bcx - ex - 7, topY - 9, bcx - ex + 5, topY - 1, dark)
      c.triangle(bcx + ex + 4, topY + 6, bcx + ex + 7, topY - 9, bcx + ex - 5, topY - 1, dark)
      c.triangle(bcx - ex - 3, topY + 3, bcx - ex - 4, topY - 5, bcx - ex + 2, topY - 1, accent)
      c.triangle(bcx + ex + 3, topY + 3, bcx + ex + 4, topY - 5, bcx + ex - 2, topY - 1, accent)
      break
    case 'fox':
      c.triangle(bcx - ex - 3, topY + 6, bcx - ex - 9, topY - 11, bcx - ex + 6, topY - 2, dark)
      c.triangle(bcx + ex + 3, topY + 6, bcx + ex + 9, topY - 11, bcx + ex - 6, topY - 2, dark)
      c.triangle(bcx - ex - 6, topY - 6, bcx - ex - 2, topY + 1, bcx - ex + 1, topY - 3, [40, 40, 48, 255])
      c.triangle(bcx + ex + 6, topY - 6, bcx + ex + 2, topY + 1, bcx + ex - 1, topY - 3, [40, 40, 48, 255])
      break
    case 'bunny':
      c.ellipse(bcx - 7, topY - 9, 4, 11, dark)
      c.ellipse(bcx + 7, topY - 9, 4, 11, dark)
      c.ellipse(bcx - 7, topY - 9, 2, 8, accent)
      c.ellipse(bcx + 7, topY - 9, 2, 8, accent)
      break
    case 'floppy':
      // droopy dog ears hanging at the sides of the head
      c.ellipse(bcx - ex - 4, topY + 8, 6, 12, dark)
      c.ellipse(bcx + ex + 4, topY + 8, 6, 12, dark)
      c.ellipse(bcx - ex - 4, topY + 9, 3, 8, accent)
      c.ellipse(bcx + ex + 4, topY + 9, 3, 8, accent)
      break
    default:
      break
  }
}

function drawCreature(c: Canvas, f: FrameSpec, sp: Species): void {
  const cx = FRAME / 2
  const t: RGB = f.tint
  const body = tinted(sp.body, t, f.dim)
  const bodyDark = tinted(sp.bodyDark, t, f.dim)
  const belly = tinted(sp.belly, t, f.dim)
  const accent = tinted(sp.accent, t, f.dim)
  const floaty = sp.shape === 'ghost'

  const bobY = f.bob + (floaty ? -4 : 0)
  // shape-dependent body radii
  const tall = sp.shape === 'tall'
  const wide = sp.shape === 'slime'
  const ry = (wide ? 22 : tall ? 29 : 26) * (1 - f.squash * 0.18)
  const rx = (wide ? 28 : tall ? 22 : 24) * (1 + f.squash * 0.18)
  const groundY = FRAME - 10
  const bcx = cx
  const bcy = groundY - ry + bobY

  // feet (not for slime/ghost)
  if (sp.shape !== 'slime' && !floaty) {
    const footY = groundY - 2 + bobY * 0.3
    c.ellipse(cx - 11 + f.legPhase * 5, footY, 7, 5, bodyDark)
    c.ellipse(cx + 11 - f.legPhase * 5, footY, 7, 5, bodyDark)
  }

  // ears (drawn behind/above body)
  drawEars(c, sp, bcx, bcy, rx, ry, bodyDark, accent)

  // body
  c.ellipse(bcx, bcy, rx + 1, ry + 1, bodyDark)
  c.ellipse(bcx, bcy, rx, ry, body)
  if (floaty) {
    // wavy ghost tail
    for (let i = -2; i <= 2; i++) {
      c.ellipse(bcx + i * 9, bcy + ry - 2, 5, 4 + (i % 2 ? 2 : 0), body)
    }
  }
  // belly highlight
  c.ellipse(bcx, bcy + 4, rx * 0.6, ry * 0.55, belly)

  const eyeY = bcy - 4
  const eyeDX = sp.bigEyes ? 10 : 9
  if (f.blink) {
    c.line(bcx - eyeDX - 3, eyeY, bcx - eyeDX + 3, eyeY, [...EYE, 255])
    c.line(bcx + eyeDX - 3, eyeY, bcx + eyeDX + 3, eyeY, [...EYE, 255])
  } else if (sp.bigEyes) {
    // large anime eyes with a coloured iris + double shine
    for (const sx of [-eyeDX, eyeDX]) {
      c.ellipse(bcx + sx, eyeY, 5.5, 7, [...WHITE, 255])
      c.ellipse(bcx + sx, eyeY + 1, 4, 5, [...EYE, 255])
      c.ellipse(bcx + sx, eyeY + 1.5, 3, 3.5, [accent[0], accent[1], accent[2], 255])
      c.ellipse(bcx + sx - 1.5, eyeY - 1.5, 1.6, 2, [...WHITE, 255])
      c.ellipse(bcx + sx + 1.5, eyeY + 2.5, 1, 1.2, [...WHITE, 230])
    }
  } else {
    for (const sx of [-eyeDX, eyeDX]) {
      c.ellipse(bcx + sx, eyeY, 4, 5, [...WHITE, 255])
      c.ellipse(bcx + sx + 1, eyeY + 1, 2, 2.5, [...EYE, 255])
    }
  }

  // cheeks for happy moods
  if (f.mouth === 'smile' || f.mouth === 'bigsmile' || f.mouth === 'tongue') {
    c.ellipse(bcx - 15, bcy + 2, 3, 2, [...CHEEK, 180])
    c.ellipse(bcx + 15, bcy + 2, 3, 2, [...CHEEK, 180])
  }

  // mouth
  const my = bcy + 7
  switch (f.mouth) {
    case 'smile':
      c.line(bcx - 5, my, bcx, my + 3, [...EYE, 255])
      c.line(bcx, my + 3, bcx + 5, my, [...EYE, 255])
      break
    case 'bigsmile':
      c.ellipse(bcx, my, 6, 4, [...EYE, 255])
      c.ellipse(bcx, my - 1, 5, 2.5, body)
      break
    case 'tongue':
      c.ellipse(bcx, my, 5, 3, [...EYE, 255])
      c.ellipse(bcx, my + 2, 3, 2, [...CHEEK, 255])
      break
    case 'frown':
      c.line(bcx - 5, my + 2, bcx, my - 1, [...EYE, 255])
      c.line(bcx, my - 1, bcx + 5, my + 2, [...EYE, 255])
      break
    case 'open':
      c.ellipse(bcx, my + 1, 3, 4, [...EYE, 255])
      break
    case 'sick':
      c.line(bcx - 4, my, bcx, my + 2, [...EYE, 255])
      c.line(bcx, my + 2, bcx + 2, my, [...EYE, 255])
      c.line(bcx + 2, my, bcx + 4, my + 2, [...EYE, 255])
      break
    default:
      c.line(bcx - 4, my, bcx + 4, my, [...EYE, 255])
  }

  // extras
  for (const ex of f.extras) {
    if (ex === 'zzz') {
      c.rect(bcx + 16, bcy - 22, 4, 1, [...EYE, 255])
      c.rect(bcx + 16, bcy - 18, 4, 1, [...EYE, 255])
      c.line(bcx + 20, bcy - 22, bcx + 16, bcy - 18, [...EYE, 255])
      c.rect(bcx + 22, bcy - 30, 5, 1, [...EYE, 255])
      c.line(bcx + 27, bcy - 30, bcx + 22, bcy - 25, [...EYE, 255])
    } else if (ex === 'sweat') {
      c.ellipse(bcx + 17, eyeY - 2, 2.5, 3.5, [120, 200, 255, 220])
    } else if (ex === 'sparkle') {
      c.line(bcx + 18, bcy - 18, bcx + 22, bcy - 14, [255, 240, 120, 255])
      c.line(bcx + 22, bcy - 18, bcx + 18, bcy - 14, [255, 240, 120, 255])
    } else if (ex === 'note') {
      c.ellipse(bcx + 19, bcy - 16, 2, 2, [...EYE, 255])
      c.rect(bcx + 20, bcy - 22, 1, 6, [...EYE, 255])
    } else if (ex === 'heart') {
      c.ellipse(bcx + 16, bcy - 18, 2, 2, [255, 90, 110, 255])
      c.ellipse(bcx + 20, bcy - 18, 2, 2, [255, 90, 110, 255])
      c.ellipse(bcx + 18, bcy - 15, 3, 2, [255, 90, 110, 255])
    } else if (ex === 'question') {
      c.rect(bcx + 17, bcy - 22, 4, 1, [...EYE, 255])
      c.rect(bcx + 20, bcy - 21, 1, 3, [...EYE, 255])
      c.rect(bcx + 18, bcy - 15, 1, 1, [...EYE, 255])
    } else if (ex === 'tear') {
      c.ellipse(bcx - 9, eyeY + 6, 2, 3, [120, 200, 255, 220])
    }
  }
}

// ---- per-animation frame programs ---------------------------------------
const W: RGB = [255, 255, 255]
const SICK: RGB = [150, 230, 150]

function spec(p: Partial<FrameSpec>): FrameSpec {
  return {
    bob: 0,
    squash: 0,
    blink: false,
    mouth: 'smile',
    legPhase: 0,
    extras: [],
    tint: W,
    dim: 1,
    ...p
  }
}

function frames(name: string): FrameSpec[] {
  switch (name) {
    case 'idle':
      return [
        spec({ bob: 0, mouth: 'smile' }),
        spec({ bob: -1, mouth: 'smile' }),
        spec({ bob: 0, blink: true, mouth: 'smile' }),
        spec({ bob: 1, mouth: 'smile' })
      ]
    case 'walk':
    case 'returningHome':
      return [0, 1, 2, 3, 4, 5].map((i) =>
        spec({ bob: i % 2 ? -2 : 0, legPhase: Math.sin((i / 6) * Math.PI * 2), mouth: 'smile' })
      )
    case 'run':
      return [0, 1, 2, 3, 4, 5].map((i) =>
        spec({ bob: i % 2 ? -3 : 0, squash: i % 2 ? 0.1 : 0, legPhase: Math.sin((i / 6) * Math.PI * 2) * 1.4, mouth: 'open' })
      )
    case 'jump':
      return [
        spec({ bob: 2, squash: 0.25, mouth: 'open' }),
        spec({ bob: -8, squash: -0.1, mouth: 'open' }),
        spec({ bob: -12, mouth: 'bigsmile' }),
        spec({ bob: -4, mouth: 'open' })
      ]
    case 'sleeping':
    case 'sleep':
      return [
        spec({ bob: 0, blink: true, mouth: 'flat', extras: ['zzz'], dim: 0.85 }),
        spec({ bob: 1, blink: true, mouth: 'flat', extras: ['zzz'], dim: 0.85 }),
        spec({ bob: 1, blink: true, mouth: 'flat', extras: ['zzz', 'note'], dim: 0.85 }),
        spec({ bob: 0, blink: true, mouth: 'flat', extras: ['zzz'], dim: 0.85 })
      ]
    case 'happy':
      return [
        spec({ bob: 0, mouth: 'bigsmile', extras: ['sparkle'] }),
        spec({ bob: -4, mouth: 'bigsmile', extras: ['heart'] }),
        spec({ bob: -6, mouth: 'tongue', extras: ['sparkle'] }),
        spec({ bob: -2, mouth: 'bigsmile' })
      ]
    case 'excited':
      return [
        spec({ bob: -2, squash: 0.1, mouth: 'open', extras: ['sparkle'] }),
        spec({ bob: -8, mouth: 'bigsmile', extras: ['sparkle', 'note'] }),
        spec({ bob: -2, mouth: 'open', extras: ['heart'] }),
        spec({ bob: -8, mouth: 'bigsmile', extras: ['sparkle'] })
      ]
    case 'sad':
      return [
        spec({ bob: 2, mouth: 'frown', extras: ['tear'], dim: 0.92 }),
        spec({ bob: 3, mouth: 'frown', extras: ['tear'], dim: 0.92 }),
        spec({ bob: 2, blink: true, mouth: 'frown', dim: 0.92 }),
        spec({ bob: 3, mouth: 'frown', dim: 0.92 })
      ]
    case 'hungry':
      return [
        spec({ bob: 0, mouth: 'open', extras: ['sweat'] }),
        spec({ bob: 1, mouth: 'flat', extras: ['sweat'] }),
        spec({ bob: 0, mouth: 'open' }),
        spec({ bob: 1, mouth: 'flat', extras: ['sweat'] })
      ]
    case 'talking':
      return [
        spec({ bob: 0, mouth: 'open', extras: ['note'] }),
        spec({ bob: -1, mouth: 'smile' }),
        spec({ bob: 0, mouth: 'open' }),
        spec({ bob: -1, mouth: 'bigsmile' })
      ]
    case 'playing':
      return [
        spec({ bob: -4, squash: 0.1, mouth: 'tongue', extras: ['sparkle'] }),
        spec({ bob: -8, mouth: 'bigsmile' }),
        spec({ bob: -2, mouth: 'tongue', extras: ['note'] }),
        spec({ bob: -8, mouth: 'bigsmile', extras: ['sparkle'] })
      ]
    case 'eating':
      return [
        spec({ bob: 0, mouth: 'open' }),
        spec({ bob: 1, mouth: 'bigsmile' }),
        spec({ bob: 0, mouth: 'open', extras: ['sparkle'] }),
        spec({ bob: 1, mouth: 'smile' })
      ]
    case 'sick':
      return [
        spec({ bob: 1, mouth: 'sick', tint: SICK, dim: 0.9, extras: ['sweat'] }),
        spec({ bob: 2, blink: true, mouth: 'sick', tint: SICK, dim: 0.9 }),
        spec({ bob: 1, mouth: 'sick', tint: SICK, dim: 0.9, extras: ['sweat'] }),
        spec({ bob: 2, mouth: 'sick', tint: SICK, dim: 0.9 })
      ]
    case 'curious':
    case 'exploring':
      return [
        spec({ bob: 0, mouth: 'smile', extras: ['question'] }),
        spec({ bob: -2, mouth: 'open', legPhase: 0.5 }),
        spec({ bob: 0, blink: true, mouth: 'smile' }),
        spec({ bob: -1, mouth: 'open', legPhase: -0.5, extras: ['question'] })
      ]
    case 'sitting':
    case 'relaxed':
    case 'idle2':
      return [
        spec({ bob: 2, squash: 0.15, mouth: 'smile' }),
        spec({ bob: 2, squash: 0.15, blink: true, mouth: 'smile' }),
        spec({ bob: 3, squash: 0.18, mouth: 'smile' }),
        spec({ bob: 2, squash: 0.15, mouth: 'smile' })
      ]
    case 'bored':
      return [
        spec({ bob: 1, mouth: 'flat' }),
        spec({ bob: 2, mouth: 'flat', extras: ['sweat'] }),
        spec({ bob: 1, blink: true, mouth: 'flat' }),
        spec({ bob: 2, mouth: 'flat' })
      ]
    default:
      return frames('idle')
  }
}

const ANIMATIONS: { name: string; fps: number; loop: boolean }[] = [
  { name: 'idle', fps: 5, loop: true },
  { name: 'walk', fps: 10, loop: true },
  { name: 'run', fps: 14, loop: true },
  { name: 'jump', fps: 10, loop: false },
  { name: 'sleeping', fps: 3, loop: true },
  { name: 'happy', fps: 8, loop: true },
  { name: 'excited', fps: 10, loop: true },
  { name: 'sad', fps: 4, loop: true },
  { name: 'hungry', fps: 5, loop: true },
  { name: 'talking', fps: 8, loop: true },
  { name: 'playing', fps: 10, loop: true },
  { name: 'eating', fps: 8, loop: true },
  { name: 'sick', fps: 4, loop: true },
  { name: 'exploring', fps: 7, loop: true },
  { name: 'sitting', fps: 4, loop: true },
  { name: 'bored', fps: 4, loop: true },
  { name: 'returningHome', fps: 10, loop: true }
]

function renderStrip(name: string, sp: Species): { buffer: Buffer; frames: number } {
  const fs = frames(name)
  const sheet = new Canvas(FRAME * fs.length, FRAME)
  fs.forEach((f, i) => {
    const c = new Canvas(FRAME, FRAME)
    drawCreature(c, f, sp)
    sheet.blit(c, i * FRAME, 0)
  })
  return { buffer: sheet.buffer(), frames: fs.length }
}

function renderHouse(appearance: string): Buffer {
  const c = new Canvas(140, 120)
  const wall: RGBA = appearance === 'modern' ? [230, 230, 235, 255] : [214, 180, 140, 255]
  const roof: RGBA = appearance === 'modern' ? [90, 110, 140, 255] : [150, 70, 60, 255]
  const door: RGBA = [110, 75, 50, 255]
  // walls
  c.rect(30, 55, 80, 60, wall)
  c.rect(30, 55, 80, 60, [0, 0, 0, 0])
  c.ring(70, 85, 40, 30, [120, 90, 60, 120])
  // roof
  for (let y = 0; y < 35; y++) c.rect(70 - (35 - y) - 10, 20 + y, (35 - y) * 2 + 20, 1, roof)
  // door
  c.rect(60, 85, 20, 30, door)
  c.ellipse(76, 100, 1.5, 1.5, [240, 220, 120, 255])
  // window
  c.rect(38, 65, 14, 14, [150, 210, 235, 255])
  c.line(45, 65, 45, 79, [80, 80, 80, 255])
  c.line(38, 72, 52, 72, [80, 80, 80, 255])
  // chimney
  c.rect(92, 30, 10, 18, [120, 70, 60, 255])
  return c.buffer()
}

function inRoundRect(x: number, y: number, w: number, h: number, r: number): boolean {
  const cx = Math.min(Math.max(x, r), w - r)
  const cy = Math.min(Math.max(y, r), h - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function renderIcon(size: number, sp: Species): Buffer {
  const c = new Canvas(size, size)
  const r = size * 0.26
  // vertical gradient rounded-square background (deep indigo → teal-navy)
  const top: RGB = [86, 104, 168]
  const bot: RGB = [33, 44, 78]
  for (let y = 0; y < size; y++) {
    const k = y / size
    const col: RGBA = [
      Math.round(top[0] + (bot[0] - top[0]) * k),
      Math.round(top[1] + (bot[1] - top[1]) * k),
      Math.round(top[2] + (bot[2] - top[2]) * k),
      255
    ]
    for (let x = 0; x < size; x++) {
      if (inRoundRect(x, y, size, size, r)) c.px(x, y, col)
    }
  }
  // glossy highlight across the top third
  for (let y = 0; y < size * 0.42; y++) {
    const a = Math.round(46 * (1 - y / (size * 0.42)))
    for (let x = 0; x < size; x++) if (inRoundRect(x, y, size, size, r)) c.px(x, y, [255, 255, 255, a])
  }
  // soft species-coloured glow behind the mascot
  c.ellipse(size / 2, size * 0.58, size * 0.34, size * 0.34, [sp.accent[0], sp.accent[1], sp.accent[2], 40])
  // sparkles
  c.ellipse(size * 0.76, size * 0.26, size * 0.018, size * 0.05, [255, 255, 255, 220])
  c.ellipse(size * 0.76, size * 0.26, size * 0.05, size * 0.018, [255, 255, 255, 220])
  c.ellipse(size * 0.22, size * 0.34, size * 0.012, size * 0.035, [255, 255, 255, 180])
  c.ellipse(size * 0.22, size * 0.34, size * 0.035, size * 0.012, [255, 255, 255, 180])
  // face only (scaled creature)
  const tmp = new Canvas(FRAME, FRAME)
  drawCreature(tmp, spec({ bob: -2, mouth: 'bigsmile', extras: ['sparkle'] }), sp)
  // nearest-neighbour scale tmp into icon
  const scale = (size * 0.9) / FRAME
  const offx = (size - FRAME * scale) / 2
  const offy = (size - FRAME * scale) / 2 + size * 0.04
  for (let y = 0; y < FRAME; y++)
    for (let x = 0; x < FRAME; x++) {
      const i = (y * FRAME + x) * 4
      const a = tmp.png.data[i + 3]
      if (a > 0) {
        const dx = Math.floor(offx + x * scale)
        const dy = Math.floor(offy + y * scale)
        for (let sy = 0; sy < Math.ceil(scale); sy++)
          for (let sx = 0; sx < Math.ceil(scale); sx++)
            c.px(dx + sx, dy + sy, [tmp.png.data[i], tmp.png.data[i + 1], tmp.png.data[i + 2], a])
      }
    }
  return c.buffer()
}

/** Render a standalone app icon of an arbitrary size (used for build assets). */
export function appIcon(size: number, speciesId = 'tato'): Buffer {
  return renderIcon(size, SPECIES[speciesId] ?? SPECIES.tato)
}

/** Result of a generation pass: filename → PNG buffer, plus the manifest. */
export interface GeneratedPack {
  files: Record<string, Buffer>
  manifest: PackManifest
}

export function buildPack(packName = 'default', houseAppearance = 'cottage'): GeneratedPack {
  // The pack name doubles as the species id; unknown names fall back to Tato.
  const sp = SPECIES[packName] ?? SPECIES.tato
  const files: Record<string, Buffer> = {}
  const animations: PackManifest['animations'] = {}
  for (const a of ANIMATIONS) {
    const { buffer, frames: n } = renderStrip(a.name, sp)
    const file = `${a.name}.png`
    files[file] = buffer
    animations[a.name] = { file, frames: n, fps: a.fps, loop: a.loop }
  }
  files['house.png'] = renderHouse(houseAppearance)
  files['house-modern.png'] = renderHouse('modern')
  files['icon.png'] = renderIcon(256, sp)
  files['tray.png'] = renderIcon(32, sp)
  const manifest: PackManifest = {
    version: 1,
    name: packName,
    title: sp.name,
    frameWidth: FRAME,
    frameHeight: FRAME,
    animations,
    house: 'house.png',
    icon: 'icon.png'
  }
  return { files, manifest }
}
