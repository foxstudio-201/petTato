import { writeFileSync, existsSync, readFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../paths.js'
import { log } from '../logger.js'
import { buildPack, listSpecies, type PackManifest } from './spritegen.js'

const PACK_VERSION = 1

/**
 * Ensure a single sprite pack exists on disk under
 * `<userData>/generated_assets/<pack>/`. Regenerates when missing or when the
 * generator version changes. The pack name doubles as the built-in species id.
 */
export function ensureAssets(packName = 'default', houseAppearance = 'cottage'): {
  dir: string
  manifest: PackManifest
} {
  const dir = join(paths.generatedAssets(), packName)
  const manifestPath = join(dir, 'manifest.json')

  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackManifest
      if (manifest.version === PACK_VERSION) return { dir, manifest }
    } catch {
      /* regenerate */
    }
  }

  log.info('Generating sprite pack:', packName)
  mkdirSync(dir, { recursive: true })
  const { files, manifest } = buildPack(packName, houseAppearance)
  for (const [name, buf] of Object.entries(files)) writeFileSync(join(dir, name), buf)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  // top-level icon/tray reflect the active pack
  writeFileSync(join(paths.generatedAssets(), 'icon.png'), files['icon.png'])
  writeFileSync(join(paths.generatedAssets(), 'tray.png'), files['tray.png'])
  log.info('Sprite pack generated at', dir)
  return { dir, manifest }
}

/** Generate every built-in species pack so the picker has a full gallery. */
export function ensureAllBuiltins(houseAppearance = 'cottage'): void {
  for (const sp of listSpecies()) ensureAssets(sp.id, houseAppearance)
  // keep the legacy 'default' alias around (renders as Tato)
  ensureAssets('default', houseAppearance)
}

export interface PackInfo {
  name: string
  title: string
  frameWidth: number
  frameHeight: number
  builtin: boolean
  imported: boolean
}

/** List all installed sprite packs (built-ins + user-imported). */
export function listPacks(): PackInfo[] {
  const builtinIds = new Set(listSpecies().map((s) => s.id))
  const root = paths.generatedAssets()
  const out: PackInfo[] = []
  if (!existsSync(root)) return out
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(root, entry.name, 'manifest.json')
    if (!existsSync(manifestPath)) continue
    try {
      const m = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackManifest
      out.push({
        name: entry.name,
        title: m.title ?? entry.name,
        frameWidth: m.frameWidth ?? 80,
        frameHeight: m.frameHeight ?? 80,
        builtin: builtinIds.has(entry.name) || entry.name === 'default',
        imported: !builtinIds.has(entry.name) && entry.name !== 'default'
      })
    } catch {
      /* skip bad manifest */
    }
  }
  return out
}

/**
 * Import a sprite pack from an external directory. The folder must contain a
 * valid `manifest.json` (and the PNG strips it references). Returns the new
 * pack name on success.
 */
export function importPack(srcDir: string): { ok: boolean; name?: string; error?: string } {
  try {
    const manifestPath = join(srcDir, 'manifest.json')
    if (!existsSync(manifestPath)) return { ok: false, error: 'No manifest.json in the selected folder.' }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackManifest
    if (!manifest.animations || !manifest.animations.idle) {
      return { ok: false, error: 'manifest.json must define at least an "idle" animation.' }
    }
    const name = (manifest.name || 'imported').replace(/[^a-z0-9_-]/gi, '_')
    const destName = listSpecies().some((s) => s.id === name) ? name + '_custom' : name
    const dest = join(paths.generatedAssets(), destName)
    mkdirSync(dest, { recursive: true })
    // copy manifest + every referenced PNG (and any extra PNGs in the folder)
    writeFileSync(join(dest, 'manifest.json'), JSON.stringify({ ...manifest, name: destName }, null, 2))
    for (const entry of readdirSync(srcDir)) {
      if (entry.toLowerCase().endsWith('.png') && statSync(join(srcDir, entry)).isFile()) {
        writeFileSync(join(dest, entry), readFileSync(join(srcDir, entry)))
      }
    }
    log.info('Imported sprite pack:', destName)
    return { ok: true, name: destName }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
