# Local API Reference

The control-panel server binds **only** to `127.0.0.1` (loopback). A hard guard
rejects any request whose source address is not localhost. Default port:
**3577** (configurable via `system.apiPort`).

Base URL: `http://127.0.0.1:3577`

## Read

| Method | Path | Description |
|---|---|---|
| GET | `/api/pet` | Full pet snapshot (stats, emotion, state, position, …) |
| GET | `/api/stats` | Just the stat vector |
| GET | `/api/memory` | Recent memories, conversations, interaction counts, habits |
| GET | `/api/history` | Recent history events |
| GET | `/api/personalities` | Built-in + mod personalities |
| GET | `/api/config` | Current configuration |
| GET | `/api/metrics` | Uptime, ticks, RSS/heap, DB size |
| GET | `/api/logs` | Last ~300 log lines |
| GET | `/api/displays` | Connected monitors |
| GET | `/api/pets` | All pets |
| GET | `/api/mods` | Installed mods |
| GET | `/api/backups` | Available backup files |
| GET | `/api/events` | **SSE** stream of `update` / `speech` events |

## Interactions

| Method | Path | Body |
|---|---|---|
| POST | `/api/feed` `/api/pet` `/api/play` `/api/clean` `/api/gift` `/api/train` `/api/sleep` `/api/wake` | — |
| POST | `/api/talk` | `{ "text": "hello!" }` |
| POST | `/api/minigame/start` | — → `{ id, kind, prompt, options }` |
| POST | `/api/minigame/answer` | `{ "id": "...", "answer": "..." }` |

## Pet management

| Method | Path | Body |
|---|---|---|
| POST | `/api/pet/rename` | `{ "name": "Spud" }` |
| POST | `/api/pet/personality` | `{ "personalityId": "calm" }` |
| POST | `/api/pet/home` | — (set home to current spot) |
| POST | `/api/pets` | `{ "name", "personalityId" }` → `{ id }` |
| POST | `/api/pets/active` | `{ "id": 2 }` |

## Settings & system

| Method | Path | Body |
|---|---|---|
| POST | `/api/settings` | Partial `AppConfig` (deep-merged) |
| POST | `/api/autostart` | `{ "enabled": true }` |

## Save manager

| Method | Path | Notes |
|---|---|---|
| GET | `/api/export` | Downloads `pettato-save.sqlite` |
| POST | `/api/import` | Body = raw SQLite image (`application/octet-stream`) |
| POST | `/api/backup` | `{ "tag": "manual" }` → `{ file }` |
| POST | `/api/restore` | `{ "file": "pettato-...sqlite" }` |

### Example

```bash
curl http://127.0.0.1:3577/api/pet
curl -X POST http://127.0.0.1:3577/api/feed
curl -X POST http://127.0.0.1:3577/api/talk \
  -H 'Content-Type: application/json' -d '{"text":"hi!"}'
```
