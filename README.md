# 🥔 petTaTo

**petTaTo** is a lightweight, feature-rich, fully **offline** desktop virtual pet.
A cute companion lives directly on your desktop — it walks around, has moods and
needs, remembers you, talks, plays, sleeps, gets hungry, and develops habits
over time. Everything runs **locally**: no cloud, no accounts, no external AI,
no telemetry.

> Built with **Electron + SQLite** (backend) and **Svelte + TypeScript**
> (frontend). Inspired by Shimeji, Desktop Goose and Tamagotchi-style companions.

---

## ✨ Features

- **Living desktop pet** — transparent, always-on-top overlay that walks, runs,
  explores, sits, sleeps and returns home. Drag it anywhere; right-click for the
  menu; click to chat.
- **8 continuous needs** — hunger, energy, happiness, social, health, comfort,
  cleanliness, curiosity. They evolve in real time **and while the app is
  closed** (offline progression on next launch).
- **Emotion engine** — 10 emotions derived from needs + time of day, driving
  dialogue, animation, movement and requests.
- **Behaviour state machine** — 15 states with weighted, personality-aware
  transitions.
- **8 personalities** (Friendly, Energetic, Lazy, Shy, Curious, Mischievous,
  Calm, Cheerful) — plus custom ones via mods.
- **Local dialogue engine** — contextual, memory-aware conversations and a
  keyword responder. 100% offline.
- **Memory** — remembers interactions, conversations, favourite activities,
  visit times/habits, feeding & play history, and time spent together.
- **Interactions** — feed, talk, pet, play, sleep, wake, clean, gift, train,
  plus mini-games (math, quiz, memory, puzzle) that reward stats.
- **Time-aware** — sleepier at night, livelier by day.
- **Local web control panel + REST API** on `http://127.0.0.1:3577` (loopback
  only, never exposed externally).
- **Save system** — SQLite with auto-save, manual save, export/import, backup &
  restore.
- **System tray**, **autostart on login**, **multi-monitor**, **high-DPI**,
  **click-through** and **follow-cursor** modes.
- **Accessibility** — keyboard navigation, UI scaling, reduced motion, high
  contrast.
- **Mods** — custom personalities, dialogue and sprite/house packs, auto-loaded.
- **Programmatic assets** — all sprite sheets, the house, and icons are
  generated from code on first launch (no binary art shipped).

---

## 🚀 Quick start

```bash
npm install          # install dependencies
npm run dev          # launch in development (hot reload)
```

Build and run a production bundle:

```bash
npm run build
npm start
```

Open the control panel at **http://127.0.0.1:3577** (or via the tray →
*Open Dashboard*).

---

## 📦 Packaging

```bash
npm run dist:linux   # AppImage + .deb + .rpm
npm run dist:win     # NSIS .exe + .msi
npm run dist:mac     # .dmg
npm run dist         # all targets for the current OS
```

Installers are written to `dist/`. See **[docs/PACKAGING.md](docs/PACKAGING.md)**.

---

## 🧪 Tests

```bash
npm test             # unit tests for the simulation core + asset generator
```

---

## 📚 Documentation

| Guide | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Modules, data flow, design |
| [Development](docs/DEVELOPMENT.md) | Local setup & workflow |
| [Build](docs/BUILD.md) | Build pipeline |
| [Packaging](docs/PACKAGING.md) | Cross-platform installers |
| [Configuration](docs/CONFIGURATION.md) | All settings |
| [API](docs/API.md) | Local REST API reference |
| [Modding](docs/MODDING.md) | Create mods |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues |

---

## 🗂 Where data lives

Everything is stored under your OS user-data directory:

- **Linux:** `~/.config/petTaTo/`
- **Windows:** `%APPDATA%/petTaTo/`
- **macOS:** `~/Library/Application Support/petTaTo/`

Contains `data/pettato.sqlite` (save), `config/config.json`, `generated_assets/`,
`mods/`, `logs/` and `data/backups/`.

## License

MIT.
