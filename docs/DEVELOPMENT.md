# Development Guide

## Prerequisites

- Node.js ≥ 20 (developed on Node 26)
- npm
- Linux: a desktop session (X11 or Wayland via XWayland). Windows/macOS work out
  of the box.

## Setup

```bash
npm install
npm run dev      # electron-vite dev server + Electron with hot reload
```

The overlay pet appears on your desktop and the tray icon gives quick actions.
Open the dashboard from the tray, or visit `http://127.0.0.1:3577`.

## Project layout

```
src/
  main/         Electron main process (simulation, DB, API, platform, assets, mods)
  preload/      Context-isolated IPC bridge
  renderer/
    pet/        Transparent desktop overlay (Svelte + canvas)
    dashboard/  Control-panel SPA (Svelte)
  shared/       Types shared across processes
scripts/        Asset regeneration tool
test/           node:test unit tests
docs/           Documentation
```

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Develop with hot reload |
| `npm run build` | Production build into `out/` |
| `npm start` | Preview the production build |
| `npm test` | Run unit tests |
| `npm run typecheck` | Type-check main + renderer |
| `npm run gen:assets` | Regenerate sprite pack + `build/icon.png` |

## Conventions

- Keep OS-specific code inside `src/main/platform/`.
- The engine is the single source of truth; UIs are stateless views that send
  commands and render snapshots.
- Stats are pure functions — keep `applyDecay` deterministic so offline
  progression matches live behaviour.
