/**
 * English strings. Keys are the canonical English source text. This file is the
 * single source of truth for which keys exist; vi.ts mirrors these keys.
 */
const en: Record<string, string> = {
  // --- nav ---
  Dashboard: 'Dashboard',
  Pet: 'Pet',
  Appearance: 'Appearance',
  Interactions: 'Interactions',
  Play: 'Play',
  Saves: 'Saves',
  Mods: 'Mods',
  Settings: 'Settings',
  Developer: 'Developer',
  About: 'About',

  // --- common ---
  'virtual companion': 'virtual companion',
  'Connecting to petTaTo…': 'Connecting to petTaTo…',
  'Starting up your companion': 'Starting up your companion',
  'Retrying…': 'Retrying…',
  Save: 'Save',
  Create: 'Create',
  Activate: 'Activate',
  Restore: 'Restore',
  Export: 'Export',
  Import: 'Import',
  Close: 'Close',

  // --- actions (also used as quick-action labels) ---
  feed: 'feed',
  pet: 'pet',
  play: 'play',
  talk: 'talk',
  clean: 'clean',
  gift: 'gift',
  train: 'train',
  sleep: 'sleep',
  wake: 'wake',
  Feed: 'Feed',
  Clean: 'Clean',
  Gift: 'Gift',
  Train: 'Train',
  Wake: 'Wake',
  Sleep: 'Sleep',

  // --- dashboard ---
  Needs: 'Needs',
  'Recent activity': 'Recent activity',
  'No activity yet — say hi to your pet!': 'No activity yet — say hi to your pet!',
  'days old': 'days old',

  // --- pet config ---
  Identity: 'Identity',
  Name: 'Name',
  Personality: 'Personality',
  Activity: 'Activity',
  Social: 'Social',
  Explore: 'Explore',
  'Set Home Here': 'Set Home Here',
  'Behaviour tuning': 'Behaviour tuning',
  'Speech frequency': 'Speech frequency',
  'Activity frequency': 'Activity frequency',
  Pets: 'Pets',
  'New pet name': 'New pet name',

  // --- appearance ---
  Look: 'Look',
  Scale: 'Scale',
  Opacity: 'Opacity',
  'Animation speed': 'Animation speed',
  'House appearance': 'House appearance',
  Cottage: 'Cottage',
  Modern: 'Modern',
  'Window & display': 'Window & display',
  'Always on top': 'Always on top',
  'Click-through mode': 'Click-through mode',
  'Follow cursor': 'Follow cursor',
  Movement: 'Movement',
  'Ground (default)': 'Ground (default)',
  'Whole screen': 'Whole screen',
  Monitor: 'Monitor',
  primary: 'primary',
  'Pet type': 'Pet type',
  'How to make a pack': 'How to make a pack',
  'Import sprite pack': 'Import sprite pack',
  custom: 'custom',

  // --- interactions ---
  'Interaction settings': 'Interaction settings',
  'Quiz difficulty': 'Quiz difficulty',
  Easy: 'Easy',
  Medium: 'Medium',
  Hard: 'Hard',
  'Reward scale': 'Reward scale',
  'Notifications & speech': 'Notifications & speech',
  'Quick actions': 'Quick actions',

  // --- play ---
  'Mini-game': 'Mini-game',
  'Win games to boost happiness, curiosity and social stats.':
    'Win games to boost happiness, curiosity and social stats.',
  'New game': 'New game',

  // --- saves ---
  'Save manager': 'Save manager',
  'Backup Now': 'Backup Now',
  Backups: 'Backups',
  'No backups yet.': 'No backups yet.',

  // --- mods ---
  'Installed mods': 'Installed mods',
  'Drop mods into the mods/ folder in your data directory, then restart.':
    'Drop mods into the mods/ folder in your data directory, then restart.',
  'No mods installed. See the Modding Guide.': 'No mods installed. See the Modding Guide.',

  // --- settings ---
  Language: 'Language',
  'Voice & commands': 'Voice & commands',
  'Enable voice (microphone)': 'Enable voice (microphone)',
  'Recognition language': 'Recognition language',
  'Allow opening other apps': 'Allow opening other apps',
  "Speech recognition isn't available in this build — typed commands still work (e.g. \"open browser\", \"come here\").":
    "Speech recognition isn't available in this build — typed commands still work (e.g. \"open browser\", \"come here\").",
  Runtime: 'Runtime',
  'Simulation tick': 'Simulation tick',
  'Auto-save every': 'Auto-save every',
  'Control-panel port (restart to apply)': 'Control-panel port (restart to apply)',
  'Launch on login (autostart)': 'Launch on login (autostart)',
  Accessibility: 'Accessibility',
  'Reduced motion': 'Reduced motion',
  'High contrast UI': 'High contrast UI',
  'UI scale': 'UI scale',

  // --- developer ---
  Performance: 'Performance',
  Uptime: 'Uptime',
  Ticks: 'Ticks',
  Tick: 'Tick',
  'Current state': 'Current state',
  Logs: 'Logs',
  'Logs refresh every 3s on this tab…': 'Logs refresh every 3s on this tab…',

  // --- about ---
  'About petTaTo': 'About petTaTo',
  'A fully offline desktop virtual pet. No cloud, no accounts, no telemetry — everything stays on your machine.':
    'A fully offline desktop virtual pet. No cloud, no accounts, no telemetry — everything stays on your machine.',
  Version: 'Version',

  // --- guide modal ---
  'How to make a sprite pack': 'How to make a sprite pack',
  'A sprite pack is a folder with a manifest.json and one horizontal PNG strip per animation. Click Import sprite pack and choose that folder.':
    'A sprite pack is a folder with a manifest.json and one horizontal PNG strip per animation. Click Import sprite pack and choose that folder.',
  'Each animation PNG is a horizontal strip of frames, all the same size (e.g. 80×80 or 128×128 — any size works).':
    'Each animation PNG is a horizontal strip of frames, all the same size (e.g. 80×80 or 128×128 — any size works).',
  'manifest.json declares the frame size and animations:': 'manifest.json declares the frame size and animations:',
  'Required animations: idle, walk, run, jump, sleeping, happy, excited, sad, hungry, talking, playing, eating, sick, exploring, sitting, bored, returningHome. Missing ones fall back to idle. Run npm run gen:assets to produce a reference pack you can edit.':
    'Required animations: idle, walk, run, jump, sleeping, happy, excited, sad, hungry, talking, playing, eating, sick, exploring, sitting, bored, returningHome. Missing ones fall back to idle. Run npm run gen:assets to produce a reference pack you can edit.',

  // --- toast / flash messages ---
  Renamed: 'Renamed',
  'Settings saved': 'Settings saved',
  'Personality set': 'Personality set',
  'Home set': 'Home set',
  Switched: 'Switched',
  'Pet created': 'Pet created',
  'Save imported': 'Save imported',
  Restored: 'Restored',
  'Autostart updated': 'Autostart updated',
  'Welcome!': 'Welcome! 🎉',
  Imported: 'Imported',
  'Import failed': 'Import failed',
  Backup: 'Backup'
}

export default en
