# Configuration Guide

Settings are stored as JSON at `<userData>/config/config.json` and can be edited
through the **dashboard** (recommended), the **API** (`POST /api/settings`), or
by hand (restart afterwards). Unknown/missing keys are filled from defaults on
load.

## Schema

```jsonc
{
  "schemaVersion": 1,
  "pet": { "activePetId": 1 },

  "appearance": {
    "scale": 1.0,            // 0.5–2.5 — pet size
    "opacity": 1.0,          // 0.2–1.0
    "spritePack": "default", // sprite pack name (mods can add more)
    "houseAppearance": "cottage", // "cottage" | "modern"
    "animationSpeed": 1.0    // 0.25–2.0
  },

  "behaviour": {
    "speechFrequency": 0.5,   // 0–1 — how chatty
    "activityFrequency": 0.5, // 0–1
    "tickMs": 1000            // simulation tick interval
  },

  "interaction": {
    "quizDifficulty": "easy", // "easy" | "medium" | "hard"
    "rewardScale": 1.0,       // 0.25–3.0 — stat reward multiplier
    "notificationsEnabled": true
  },

  "window": {
    "alwaysOnTop": true,
    "clickThrough": false,    // pet ignores all clicks when true
    "followCursor": false,    // pet walks toward the cursor
    "startMonitor": 0         // monitor index (see GET /api/displays)
  },

  "accessibility": {
    "reducedMotion": false,   // minimal animation
    "highContrast": false,    // high-contrast dashboard theme
    "uiScale": 1.0            // 0.8–1.6
  },

  "system": {
    "autostart": false,       // launch on login
    "apiPort": 3577,          // loopback control-panel port
    "autosaveSeconds": 30
  }
}
```

## Notes

- Changing `apiPort` changes the control-panel URL (and requires a restart of the
  server binding). The dashboard defaults to `127.0.0.1:3577`.
- `startMonitor` selects which display the pet lives on; combine with
  multi-monitor setups via `GET /api/displays`.
- Toggling `autostart` from the dashboard also registers/unregisters the OS login
  item immediately.
