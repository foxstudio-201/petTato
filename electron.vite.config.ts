import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const r = (p: string) => resolve(root, p)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: r('src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: r('src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: r('src/renderer'),
    base: './',
    plugins: [svelte()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          pet: r('src/renderer/pet/index.html'),
          dashboard: r('src/renderer/dashboard/index.html'),
          splash: r('src/renderer/splash/index.html')
        }
      }
    }
  }
})
