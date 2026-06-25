#!/usr/bin/env node
/**
 * Stand-alone asset regeneration tool.
 *
 *   node scripts/generate-assets.mjs [targetDir]
 *
 * Regenerates the default sprite pack (sheets + house + icons) into
 * `generated_assets/default/` and writes the app icon to `build/icon.png` for
 * electron-builder. The runtime also regenerates assets automatically on first
 * launch — this script is for development / repacking.
 *
 * Relies on Node's built-in TypeScript support (type stripping, Node 23+).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPack, appIcon } from '../src/main/assets/spritegen.ts'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, '..')
const target = process.argv[2] ? process.argv[2] : join(projectRoot, 'generated_assets', 'default')

mkdirSync(target, { recursive: true })
const { files, manifest } = buildPack('default', 'cottage')
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(target, name), buf)
}
writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`Generated ${Object.keys(files).length + 1} files in ${target}`)

// app icon for packaging
const buildDir = join(projectRoot, 'build')
mkdirSync(buildDir, { recursive: true })
writeFileSync(join(buildDir, 'icon.png'), appIcon(512))
console.log(`Wrote ${join(buildDir, 'icon.png')} (512×512)`)
