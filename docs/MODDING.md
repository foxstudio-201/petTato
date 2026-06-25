# Modding Guide

Mods are auto-loaded from the `mods/` folder inside your petTaTo data directory:

- **Linux:** `~/.config/petTaTo/mods/`
- **Windows:** `%APPDATA%/petTaTo/mods/`
- **macOS:** `~/Library/Application Support/petTaTo/mods/`

Each mod is a folder containing a `mod.json`. A malformed mod is skipped with a
warning and never breaks startup. Restart petTaTo after adding a mod.

## `mod.json`

```json
{
  "id": "my-mod",
  "name": "My Cool Mod",
  "version": "1.0.0",
  "author": "you",
  "personalities": [
    {
      "id": "zen",
      "name": "Zen",
      "activityRate": 0.6,
      "happinessDecay": 0.6,
      "socialNeed": 0.7,
      "exploration": 0.8,
      "talkativeness": 0.4,
      "tone": "serene"
    }
  ],
  "dialogue": [
    "Breathe in… breathe out… hello {name}.",
    "Everything is calm today."
  ],
  "spritePacks": ["sprites/myanimals"],
  "houses": []
}
```

### Capabilities

| Field | Effect |
|---|---|
| `personalities[]` | Registered immediately; selectable in **Pet Config**. Same shape as built-ins (`activityRate`, `happinessDecay`, `socialNeed`, `exploration`, `talkativeness`, `tone`). |
| `dialogue[]` | Extra spontaneous lines. `{name}`, `{activity}`, `{period}` placeholders supported. |
| `spritePacks[]` | Paths (relative to the mod folder) to a sprite-pack directory containing a `manifest.json` (same format the generator writes). |
| `houses[]` | Custom house image references. |

## Custom sprite packs

A sprite pack mirrors the generated layout: a `manifest.json` plus one PNG strip
per animation (horizontal frames, 80×80 each by default).

```
my-mod/sprites/myanimals/
  manifest.json
  idle.png  walk.png  run.png  sleeping.png  ...
```

`manifest.json`:

```json
{
  "version": 1,
  "name": "myanimals",
  "frameWidth": 80,
  "frameHeight": 80,
  "animations": {
    "idle":  { "file": "idle.png",  "frames": 4, "fps": 5,  "loop": true },
    "walk":  { "file": "walk.png",  "frames": 6, "fps": 10, "loop": true }
  },
  "house": "house.png",
  "icon": "icon.png"
}
```

Required animation keys: `idle, walk, run, jump, sleeping, happy, excited, sad,
hungry, talking, playing, eating, sick, exploring, sitting, bored,
returningHome`.

Tip: run `npm run gen:assets` to produce a reference pack you can edit.

See `mods/example-springy/` for a working example.
