import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../paths.js'
import { log } from '../logger.js'
import { registerPersonality } from '../core/personality.js'
import { registerDialogueLines } from '../core/dialogue.js'
import type { PersonalityProfile } from '../../shared/types.js'

/**
 * Mod loader. Mods live in `<userData>/mods/<id>/mod.json` and are auto-loaded
 * on startup. A mod can contribute personalities, extra dialogue lines, and
 * sprite/house packs (served read-only from their directory). Anything missing
 * or malformed is skipped with a warning — a bad mod never breaks startup.
 */
export interface ModManifest {
  id?: string
  name?: string
  version?: string
  author?: string
  personalities?: PersonalityProfile[]
  dialogue?: string[]
  spritePacks?: string[]
  houses?: string[]
}

export interface LoadedMod {
  id: string
  dir: string
  manifest: ModManifest
  spritePackDirs: string[]
}

export class ModManager {
  private mods: LoadedMod[] = []

  loadAll(): LoadedMod[] {
    const root = paths.mods()
    if (!existsSync(root)) return []
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = join(root, entry.name)
      const manifestPath = join(dir, 'mod.json')
      if (!existsSync(manifestPath)) continue
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ModManifest
        this.apply(entry.name, dir, manifest)
      } catch (err) {
        log.warn(`Skipping mod "${entry.name}":`, err)
      }
    }
    log.info(`Loaded ${this.mods.length} mod(s)`)
    return this.mods
  }

  private apply(id: string, dir: string, manifest: ModManifest): void {
    for (const p of manifest.personalities ?? []) {
      registerPersonality(p)
      log.info(`Mod "${id}" registered personality "${p.id}"`)
    }
    if (manifest.dialogue?.length) {
      registerDialogueLines(manifest.dialogue)
      log.info(`Mod "${id}" added ${manifest.dialogue.length} dialogue line(s)`)
    }
    const spritePackDirs: string[] = []
    for (const rel of manifest.spritePacks ?? []) {
      const packDir = join(dir, rel)
      if (existsSync(join(packDir, 'manifest.json')) && statSync(packDir).isDirectory()) {
        spritePackDirs.push(packDir)
      }
    }
    this.mods.push({ id, dir, manifest, spritePackDirs })
  }

  list(): LoadedMod[] {
    return this.mods
  }
}
