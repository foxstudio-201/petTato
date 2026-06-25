# Architecture

petTaTo is split into a **main process** (Node/Electron — owns the simulation,
database and HTTP API) and **renderers** (Svelte — the desktop overlay and the
control-panel dashboard). All shared shapes live in `src/shared`.

```
┌────────────────────────── Electron Main (Node) ──────────────────────────┐
│  index.ts            app lifecycle · windows · tray · loops · IPC          │
│  core/               PetEngine ── stats · emotions · stateMachine ·        │
│                                   movement · dialogue · interactions       │
│  db/                 sql.js (WASM SQLite) · schema · repositories          │
│  server/api.ts       Express REST + SSE on 127.0.0.1:3577                  │
│  platform/           windows · macos · linux (autostart, displays)         │
│  assets/             procedural sprite-sheet generator (pngjs)             │
│  mods/               auto-loader (personalities, dialogue, packs)          │
└───────────────┬───────────────────────────────────────┬───────────────────┘
                │ IPC (preload bridge)                   │ HTTP + SSE
        ┌───────▼────────┐                       ┌────────▼─────────┐
        │ renderer/pet   │  transparent overlay  │ renderer/dashboard│  control panel
        │ canvas sprite  │  drag · chat · bubble │ Svelte tabs       │  + browser
        └────────────────┘                       └───────────────────┘
```

## Simulation model

The engine separates two clocks:

- **Tick** (`engine.tick()`, every `behaviour.tickMs`, default 1 s): applies
  stat decay, derives emotion, runs the behaviour state machine, generates
  spontaneous/attention dialogue, automates sleep/wake.
- **Frame** (`engine.frame(dt)`, ~30 fps): integrates movement toward the
  current target so the overlay moves smoothly between ticks.

**Stats** are 0–100 where higher is always better. `applyDecay` is pure and time-
scaled, so the *same* function drives both live ticks and **offline progression**
(`now − lastSeen` is fast-forwarded on launch, with diminishing returns past
~12 h so a pet left for days is needy but never "dead").

**Emotions** are derived from the stat vector + time of day (`scoreEmotions`),
not stored separately, so they always reflect reality.

**Behaviour** is chosen by weighted sampling (`stateMachine.decide`) with hard
overrides for urgent needs (sick / starving / exhausted). Each behaviour carries
a movement goal (`wander` / `home` / `stay`).

**Dialogue** is fully local: template pools selected by emotion/stats/time/habits
plus a keyword responder for typed chat.

## Persistence

`sql.js` keeps the database in memory and serializes the image to
`data/pettato.sqlite` on a timer and on quit. See [the schema](#schema) and
`src/main/db/schema.ts`. Repositories (`repositories.ts`) wrap all queries.

## Data flow

1. `PetEngine` emits `update` (full snapshot) and `speech` events.
2. Main forwards them to the overlay (IPC) and to the dashboard / browser (SSE).
3. UIs call back via IPC (overlay) or REST (dashboard) — both routed through the
   single engine instance, so the desktop and the web panel stay in sync.

## Cross-platform isolation

`platform/index.ts` is the only place that branches on OS. Autostart is
registry/login-item on Windows/macOS and a freedesktop `.desktop` file on Linux.
Monitor geometry uses Electron's `screen` (abstracts X11/Wayland/Win32/Cocoa).
