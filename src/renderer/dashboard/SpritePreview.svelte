<script lang="ts">
  import { onMount } from 'svelte'
  import type { PetSnapshot } from '../../shared/types'
  import { API_BASE } from './api'

  let { snapshot, size = 128, pack = 'default' }: { snapshot: PetSnapshot | null; size?: number; pack?: string } = $props()

  let canvas: HTMLCanvasElement
  let manifest: any = null
  let frameW = 80
  let frameH = 80
  const images: Record<string, HTMLImageElement> = {}
  const ANIM_MAP: Record<string, string> = { walking: 'walk', running: 'run', returningHome: 'walk' }

  function animFor(s: PetSnapshot | null): string {
    if (!s) return 'idle'
    if (s.asleep) return 'sleeping'
    const mapped = ANIM_MAP[s.state] ?? s.state
    return manifest?.animations?.[mapped] ? mapped : 'idle'
  }

  onMount(async () => {
    try {
      manifest = await (await fetch(`${API_BASE}/assets-gen/${pack}/manifest.json`)).json()
      frameW = manifest.frameWidth || 80
      frameH = manifest.frameHeight || 80
      for (const a of Object.values<any>(manifest.animations)) {
        const img = new Image()
        img.src = `${API_BASE}/assets-gen/${pack}/${a.file}`
        images[a.file] = img
      }
    } catch {
      /* assets not ready yet */
    }
    requestAnimationFrame(render)
  })

  function render(t: number) {
    if (canvas && manifest) {
      const ctx = canvas.getContext('2d')!
      if (canvas.width !== size) {
        canvas.width = size
        canvas.height = size
      }
      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = false
      const anim = animFor(snapshot)
      const meta = manifest.animations[anim]
      const img = meta && images[meta.file]
      if (img && img.complete && img.naturalWidth > 0) {
        const frame = Math.floor((t / 1000) * meta.fps) % meta.frames
        const facing = snapshot?.facing ?? 1
        ctx.save()
        if (facing < 0) {
          ctx.translate(size, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(img, frame * frameW, 0, frameW, frameH, 0, 0, size, size)
        ctx.restore()
      }
    }
    requestAnimationFrame(render)
  }
</script>

<canvas bind:this={canvas} style={`width:${size}px;height:${size}px`}></canvas>

<style>
  canvas {
    image-rendering: pixelated;
    display: block;
  }
</style>
