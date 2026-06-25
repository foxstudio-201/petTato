<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { PetSnapshot, AppConfig } from '../../shared/types'
  import { api, subscribe } from './api'
  import StatBar from './StatBar.svelte'
  import Icon from './Icon.svelte'
  import SpritePreview from './SpritePreview.svelte'
  import Onboarding from './Onboarding.svelte'
  import { T, LANGUAGES } from './i18n'

  const STAT_META: Record<string, { icon: string; color: string }> = {
    hunger: { icon: 'bowl', color: 'var(--amber)' },
    energy: { icon: 'bolt', color: 'var(--accent)' },
    happiness: { icon: 'sun', color: 'var(--pink)' },
    social: { icon: 'chat', color: 'var(--accent-2)' },
    health: { icon: 'heart', color: 'var(--green)' },
    comfort: { icon: 'star', color: 'var(--indigo)' },
    cleanliness: { icon: 'drop', color: 'var(--accent-2)' },
    curiosity: { icon: 'sparkle', color: 'var(--indigo)' }
  }
  const STAT_KEYS = Object.keys(STAT_META) as (keyof PetSnapshot['stats'])[]

  const NAV: [string, string, string, string][] = [
    ['dashboard', 'Dashboard', 'grid', 'var(--accent)'],
    ['pet', 'Pet', 'paw', 'var(--pink)'],
    ['appearance', 'Appearance', 'palette', 'var(--indigo)'],
    ['interactions', 'Interactions', 'controller', 'var(--amber)'],
    ['play', 'Play', 'puzzle', 'var(--green)'],
    ['saves', 'Saves', 'save', 'var(--accent-2)'],
    ['mods', 'Mods', 'cube', 'var(--indigo)'],
    ['settings', 'Settings', 'gear', 'var(--accent)'],
    ['developer', 'Developer', 'code', 'var(--accent-2)'],
    ['about', 'About', 'info', 'var(--muted)']
  ]
  const ACTIONS: [string, string, string, string][] = [
    ['feed', 'Feed', 'bowl', 'var(--amber)'],
    ['pet', 'Pet', 'heart', 'var(--pink)'],
    ['clean', 'Clean', 'drop', 'var(--accent-2)'],
    ['gift', 'Gift', 'gift', 'var(--green)'],
    ['train', 'Train', 'dumbbell', 'var(--indigo)']
  ]

  let tab = $state('dashboard')
  let snap = $state<PetSnapshot | null>(null)
  let cfg = $state<AppConfig | null>(null)
  let personalities = $state<any[]>([])
  let memory = $state<any>(null)
  let metrics = $state<any>(null)
  let logs = $state<string[]>([])
  let mods = $state<any[]>([])
  let pets = $state<any[]>([])
  let backups = $state<string[]>([])
  let displays = $state<any[]>([])
  let toast = $state<string | null>(null)
  let unsub: (() => void) | null = null

  let game = $state<any>(null)
  let gameResult = $state<string | null>(null)
  let newPetName = $state('')
  let newPetPersona = $state('friendly')
  let connError = $state<string | null>(null)
  let packs = $state<any[]>([])
  let showGuide = $state(false)
  let showModGuide = $state(false)
  let modsDir = $state('')
  let voiceUnsupported = $state(false)
  let upd = $state<{ phase: string; current?: string; latest?: string; url?: string; percent?: number; message?: string }>({ phase: 'idle' })

  function flash(msg: string) {
    toast = msg
    setTimeout(() => (toast = null), 2500)
  }

  async function refreshAll() {
    ;[snap, cfg, personalities, memory, metrics, mods, pets, backups, displays] = await Promise.all([
      api.pet(), api.config(), api.personalities(), api.memory(),
      api.metrics(), api.mods(), api.pets(), api.backups(), api.displays()
    ])
  }

  async function connect(attempt = 0): Promise<void> {
    try {
      await refreshAll()
      connError = null
    } catch (err) {
      connError = String(err)
      if (attempt < 30) {
        setTimeout(() => connect(attempt + 1), 1000)
        return
      }
    }
  }

  onMount(async () => {
    if (location.hash.startsWith('#/')) tab = location.hash.slice(2)
    await connect()
    await loadPacks()
    try {
      modsDir = (await api.modsDir()).dir
    } catch {
      modsDir = ''
    }
    try {
      upd = await api.updateState()
    } catch {
      /* updater unavailable */
    }
    voiceUnsupported = !((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    unsub = subscribe(
      (s) => (snap = s),
      (l) => flash('💬 ' + l.text),
      (s) => {
        // Live download/install progress streamed from the updater.
        upd = { ...upd, ...s }
      }
    )
    setInterval(async () => {
      metrics = await api.metrics()
      if (tab === 'developer') logs = (await api.logs()).lines
      if (tab === 'dashboard') memory = await api.memory()
    }, 3000)
    window.pettato?.onNavigate?.((h: string) => (tab = h.replace('#/', '')))
  })
  onDestroy(() => unsub?.())

  async function doInteract(type: string) {
    await api.interact(type)
    snap = await api.pet()
    flash('✓ ' + t(type))
  }
  async function saveConfig() {
    if (!cfg) return
    cfg = await api.settings(cfg)
    flash(t('Settings saved'))
  }
  async function startGame() {
    gameResult = null
    game = await api.minigameStart()
  }
  async function answer(a: string) {
    const r = await api.minigameAnswer(game.id, a)
    gameResult = r.correct ? '✅ ' + r.line.text : '❌ ' + r.line.text
    game = null
    snap = await api.pet()
  }
  async function makePet() {
    if (!newPetName.trim()) return
    await api.createPet(newPetName.trim(), newPetPersona)
    newPetName = ''
    pets = await api.pets()
    flash(t('Pet created'))
  }
  async function importSave(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    await api.importSave(await file.arrayBuffer())
    await refreshAll()
    flash(t('Save imported'))
  }

  function fmtDuration(ms: number) {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }
  let tabMeta = $derived(NAV.find((n) => n[0] === tab) ?? NAV[0])
  let tr = $derived((s: string) => T(cfg?.language ?? 'en', s))
  // Plain helper usable inside event handlers (flash messages, etc.)
  const t = (s: string) => T(cfg?.language ?? 'en', s)

  async function loadPacks() {
    try {
      packs = await api.packs()
    } catch {
      packs = []
    }
  }

  async function selectPack(name: string) {
    if (!cfg) return
    cfg.appearance.spritePack = name
    await saveConfig()
    snap = await api.pet()
  }

  async function importPack() {
    const res = await window.pettato?.packsImport?.()
    if (res?.ok) {
      await loadPacks()
      flash(t('Imported') + ': ' + res.name)
    } else if (res?.error && res.error !== 'cancelled') {
      flash(t('Import failed') + ': ' + res.error)
    }
  }

  async function finishOnboarding() {
    cfg = await api.config()
    snap = await api.pet()
    await loadPacks()
    flash(t('Welcome!'))
  }

  function setRoam(v: boolean) {
    if (!cfg) return
    cfg.behaviour.freeRoam = v
    saveConfig()
  }

  async function checkUpdate() {
    upd = { ...upd, phase: 'checking', message: undefined }
    upd = { ...upd, ...(await api.updateCheck()) }
  }

  let updStatus = $derived(() => {
    switch (upd.phase) {
      case 'checking': return tr('Checking for updates…')
      case 'available': return tr('Update available') + (upd.latest ? ' v' + upd.latest : '')
      case 'downloading': return tr('Downloading update…') + ' ' + (upd.percent ?? 0) + '%'
      case 'installing': return tr('Installing…')
      case 'ready': return tr('Downloaded — finish in the installer.')
      case 'none': return tr("You're up to date.")
      case 'error': return tr('Update check failed') + (upd.message ? ': ' + upd.message : '')
      default: return ''
    }
  })

  function setLanguage(code: string) {
    if (!cfg) return
    cfg.language = code
    const lang = LANGUAGES.find((l) => l.code === code)
    if (lang) cfg.voice.recognitionLang = lang.recognition
    saveConfig()
  }
</script>

{#if cfg && !cfg.onboarded}
  <Onboarding {cfg} {packs} onDone={finishOnboarding} />
{:else}
<div
  class="layout"
  class:high-contrast={cfg?.accessibility.highContrast}
  style:--ui-scale={cfg?.accessibility.uiScale ?? 1}
>
  <!-- ============ SIDEBAR ============ -->
  <aside>
    <div class="brand">
      <div class="brand-badge"><SpritePreview {snap} size={36} pack={cfg?.appearance.spritePack ?? 'default'} /></div>
      <div>
        <div class="brand-name">petTaTo</div>
        <div class="brand-sub">{tr('virtual companion')}</div>
      </div>
    </div>

    <nav>
      {#each NAV as [id, label, icon, color]}
        <button class:active={tab === id} onclick={() => (tab = id)} style={`--c:${color}`}>
          <Icon name={icon} size={20} color={tab === id ? color : 'currentColor'} />
          <span>{tr(label)}</span>
        </button>
      {/each}
    </nav>

    {#if snap}
      <div class="side-status card tight">
        <div class="row" style="gap:10px;">
          <span class="dot" class:sleep={snap.asleep}></span>
          <div style="min-width:0;">
            <div class="ss-name">{snap.name}</div>
            <div class="muted ss-mood">{snap.emotion} · {snap.timeOfDay}</div>
          </div>
        </div>
      </div>
    {/if}
  </aside>

  <!-- ============ MAIN ============ -->
  <main>
    {#if !snap || !cfg}
      <div class="connecting">
        <div class="card" style="max-width:420px;text-align:center;">
          <div class="spinner"></div>
          <h3 style="margin:14px 0 6px;">{tr('Connecting to petTaTo…')}</h3>
          <p class="muted" style="margin:0;">{tr('Starting up your companion')}</p>
          {#if connError}
            <p class="muted" style="margin-top:10px;font-size:12px;color:var(--bad);">{tr('Retrying…')} ({connError})</p>
          {/if}
        </div>
      </div>
    {:else}
      <header class="topbar">
        <div class="row" style="gap:12px;">
          <div class="page-ic" style={`background:color-mix(in srgb, ${tabMeta[3]} 16%, transparent)`}>
            <Icon name={tabMeta[2]} size={22} color={tabMeta[3]} />
          </div>
          <h1>{tr(tabMeta[1])}</h1>
        </div>
        <div class="row" style="gap:8px;">
          <div class="mood-pill">
            <span class="mp-dot" style={`background:${tabMeta[3]}`}></span>
            {snap.emotion}{snap.asleep ? ' · 💤' : ''}
          </div>
          {#each ACTIONS.slice(0, 3) as [a, lbl, icon, color]}
            <button class="qbtn" title={tr(lbl)} onclick={() => doInteract(a)}>
              <Icon name={icon} size={20} {color} />
            </button>
          {/each}
          <button class="qbtn" title={snap.asleep ? tr('Wake') : tr('Sleep')} onclick={() => doInteract(snap?.asleep ? 'wake' : 'sleep')}>
            <Icon name={snap.asleep ? 'sun' : 'moon'} size={20} color="var(--indigo)" />
          </button>
        </div>
      </header>

      <div class="content">
        {#if tab === 'dashboard'}
          <div class="hero card">
            <div class="hero-pet">
              <div class="pet-stage"><SpritePreview {snap} size={140} pack={cfg?.appearance.spritePack ?? 'default'} /></div>
              <div class="pet-meta">
                <h2>{snap.name}</h2>
                <div class="chips">
                  <span class="chip accent"><Icon name="paw" size={14} color="var(--pink)" /> {snap.personality.name}</span>
                  <span class="chip"><Icon name="clock" size={14} color="var(--accent-2)" /> {snap.ageDays.toFixed(1)} {tr('days old')}</span>
                  <span class="chip"><Icon name="heart" size={14} color="var(--green)" /> {fmtDuration(snap.timeTogetherMs)}</span>
                </div>
                <div class="chips" style="margin-top:8px;">
                  {#each Object.entries(snap.emotionScores) as [e, v]}
                    <span class="chip soft">{e} <b>{v}</b></span>
                  {/each}
                </div>
                <div class="row wrap" style="margin-top:14px; gap:8px;">
                  {#each ACTIONS as [a, lbl, icon, color]}
                    <button class="btn secondary" onclick={() => doInteract(a)}>
                      <Icon name={icon} size={18} {color} /> {tr(lbl)}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <div class="grid two" style="margin-top:16px;">
            <div class="card">
              <div class="card-head"><Icon name="sliders" size={20} color="var(--accent)" /><h3>{tr('Needs')}</h3></div>
              {#each STAT_KEYS as k}
                <StatBar label={k} value={snap.stats[k]} icon={STAT_META[k].icon} color={STAT_META[k].color} />
              {/each}
            </div>
            <div class="card">
              <div class="card-head"><Icon name="clock" size={20} color="var(--accent-2)" /><h3>{tr('Recent activity')}</h3></div>
              {#if memory?.recent?.length}
                <ul class="timeline">
                  {#each memory.recent.slice(0, 9) as m}
                    <li>
                      <span class="tl-dot"></span>
                      <span class="tl-text">{m.detail}</span>
                      <span class="muted tl-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="muted">{tr('No activity yet — say hi to your pet!')}</p>
              {/if}
            </div>
          </div>

        {:else if tab === 'pet'}
          <div class="card">
            <div class="card-head"><Icon name="paw" size={20} color="var(--pink)" /><h3>{tr('Identity')}</h3></div>
            <div class="field">
              <label for="nm">{tr('Name')}</label>
              <div class="row">
                <input id="nm" type="text" bind:value={snap.name} />
                <button class="btn" onclick={async () => { await api.rename(snap!.name); flash(t('Renamed')) }}>{tr('Save')}</button>
              </div>
            </div>
            <div class="field">
              <label for="ps">{tr('Personality')}</label>
              <select id="ps" bind:value={snap.personality.id} onchange={async (e) => { await api.setPersonality((e.target as HTMLSelectElement).value); snap = await api.pet(); flash(t('Personality set')) }}>
                {#each personalities as p}<option value={p.id}>{p.name}</option>{/each}
              </select>
              <p class="muted" style="margin:4px 0 0;">{tr('Activity')} ×{snap.personality.activityRate} · {tr('Social')} ×{snap.personality.socialNeed} · {tr('Explore')} ×{snap.personality.exploration}</p>
            </div>
            <button class="btn secondary" onclick={async () => { await api.setHome(); flash(t('Home set')) }}><Icon name="pin" size={18} color="var(--accent)" /> {tr('Set Home Here')}</button>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head"><Icon name="sliders" size={20} color="var(--amber)" /><h3>{tr('Behaviour tuning')}</h3></div>
            <div class="field">
              <label>{tr('Speech frequency')} · {cfg.behaviour.speechFrequency.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.05" bind:value={cfg.behaviour.speechFrequency} onchange={saveConfig} />
            </div>
            <div class="field">
              <label>{tr('Activity frequency')} · {cfg.behaviour.activityFrequency.toFixed(2)}</label>
              <input type="range" min="0" max="1" step="0.05" bind:value={cfg.behaviour.activityFrequency} onchange={saveConfig} />
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head"><Icon name="cube" size={20} color="var(--indigo)" /><h3>{tr('Pets')} ({pets.length})</h3></div>
            <ul class="rows">
              {#each pets as p}
                <li>
                  <span><b>{p.name}</b> <span class="muted">· {p.personalityId}</span></span>
                  <button class="btn ghost" onclick={async () => { await api.setActive(p.id); await refreshAll(); flash(t('Switched')) }}>{tr('Activate')}</button>
                </li>
              {/each}
            </ul>
            <div class="row wrap" style="margin-top:12px;">
              <input type="text" placeholder={tr('New pet name')} bind:value={newPetName} style="flex:1;min-width:140px;background:var(--panel-2);border:1px solid var(--line);border-radius:11px;color:var(--text);padding:10px 12px;" />
              <select bind:value={newPetPersona} style="background:var(--panel-2);border:1px solid var(--line);border-radius:11px;color:var(--text);padding:10px;">
                {#each personalities as p}<option value={p.id}>{p.name}</option>{/each}
              </select>
              <button class="btn" onclick={makePet}><Icon name="plus" size={18} color="#052420" /> {tr('Create')}</button>
            </div>
          </div>

        {:else if tab === 'appearance'}
          <div class="grid two">
            <div class="card">
              <div class="card-head"><Icon name="palette" size={20} color="var(--indigo)" /><h3>{tr('Look')}</h3></div>
              <div class="field"><label>{tr('Scale')} · {cfg.appearance.scale.toFixed(2)}×</label><input type="range" min="0.5" max="2.5" step="0.05" bind:value={cfg.appearance.scale} onchange={saveConfig} /></div>
              <div class="field"><label>{tr('Opacity')} · {Math.round(cfg.appearance.opacity * 100)}%</label><input type="range" min="0.2" max="1" step="0.05" bind:value={cfg.appearance.opacity} onchange={saveConfig} /></div>
              <div class="field"><label>{tr('Animation speed')} · {cfg.appearance.animationSpeed.toFixed(2)}×</label><input type="range" min="0.25" max="2" step="0.05" bind:value={cfg.appearance.animationSpeed} onchange={saveConfig} /></div>
              <div class="field"><label for="house">{tr('House appearance')}</label>
                <select id="house" bind:value={cfg.appearance.houseAppearance} onchange={saveConfig}><option value="cottage">{tr('Cottage')}</option><option value="modern">{tr('Modern')}</option></select>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><Icon name="monitor" size={20} color="var(--accent)" /><h3>{tr('Window & display')}</h3></div>
              <div class="switch"><span class="sw-label"><Icon name="bolt" size={18} color="var(--accent)" /> {tr('Always on top')}</span><input type="checkbox" bind:checked={cfg.window.alwaysOnTop} onchange={saveConfig} /></div>
              <div class="switch"><span class="sw-label"><Icon name="cursor" size={18} color="var(--accent-2)" /> {tr('Click-through mode')}</span><input type="checkbox" bind:checked={cfg.window.clickThrough} onchange={saveConfig} /></div>
              <div class="switch"><span class="sw-label"><Icon name="cursor" size={18} color="var(--pink)" /> {tr('Follow cursor')}</span><input type="checkbox" bind:checked={cfg.window.followCursor} onchange={saveConfig} /></div>
              <div class="field" style="margin-top:14px;">
                <label>{tr('Movement')}</label>
                <div class="seg">
                  <button class:sel={!cfg.behaviour.freeRoam} onclick={() => setRoam(false)}>
                    <Icon name="monitor" size={16} color={!cfg.behaviour.freeRoam ? 'var(--accent)' : 'var(--muted)'} /> {tr('Ground (default)')}
                  </button>
                  <button class:sel={cfg.behaviour.freeRoam} onclick={() => setRoam(true)}>
                    <Icon name="sparkle" size={16} color={cfg.behaviour.freeRoam ? 'var(--green)' : 'var(--muted)'} /> {tr('Whole screen')}
                  </button>
                </div>
              </div>
              <div class="field" style="margin-top:14px;"><label for="mon">{tr('Monitor')}</label>
                <select id="mon" bind:value={cfg.window.startMonitor} onchange={saveConfig}>
                  {#each displays as d}<option value={d.index}>#{d.index} — {d.bounds.width}×{d.bounds.height}{d.primary ? ` (${tr('primary')})` : ''}</option>{/each}
                </select>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head" style="justify-content:space-between;">
              <div class="row" style="gap:10px;"><Icon name="paw" size={20} color="var(--pink)" /><h3>{tr('Pet type')}</h3></div>
              <div class="row" style="gap:8px;">
                <button class="btn secondary" onclick={() => (showGuide = true)}><Icon name="info" size={16} color="var(--accent-2)" /> {tr('How to make a pack')}</button>
                <button class="btn" onclick={importPack}><Icon name="upload" size={16} color="#052420" /> {tr('Import sprite pack')}</button>
              </div>
            </div>
            <div class="pet-gallery">
              {#each packs as p}
                <button class="pet-tile" class:sel={cfg.appearance.spritePack === p.name} onclick={() => selectPack(p.name)}>
                  <div class="tile-stage"><SpritePreview snap={snap} size={72} pack={p.name} /></div>
                  <div class="tile-name">{p.title}</div>
                  <div class="tile-meta muted">{p.frameWidth}px{p.imported ? ' · custom' : ''}</div>
                </button>
              {/each}
            </div>
          </div>

        {:else if tab === 'interactions'}
          <div class="card">
            <div class="card-head"><Icon name="controller" size={20} color="var(--amber)" /><h3>{tr('Interaction settings')}</h3></div>
            <div class="field"><label for="qd">{tr('Quiz difficulty')}</label>
              <select id="qd" bind:value={cfg.interaction.quizDifficulty} onchange={saveConfig}><option value="easy">{tr('Easy')}</option><option value="medium">{tr('Medium')}</option><option value="hard">{tr('Hard')}</option></select>
            </div>
            <div class="field"><label>{tr('Reward scale')} · {cfg.interaction.rewardScale.toFixed(2)}×</label><input type="range" min="0.25" max="3" step="0.05" bind:value={cfg.interaction.rewardScale} onchange={saveConfig} /></div>
            <div class="switch"><span class="sw-label"><Icon name="bell" size={18} color="var(--accent)" /> {tr('Notifications & speech')}</span><input type="checkbox" bind:checked={cfg.interaction.notificationsEnabled} onchange={saveConfig} /></div>
          </div>
          <div class="card" style="margin-top:16px;">
            <div class="card-head"><Icon name="sparkle" size={20} color="var(--green)" /><h3>{tr('Quick actions')}</h3></div>
            <div class="row wrap" style="gap:8px;">
              {#each [['feed', 'bowl', 'var(--amber)'], ['pet', 'heart', 'var(--pink)'], ['play', 'puzzle', 'var(--green)'], ['talk', 'chat', 'var(--accent-2)'], ['clean', 'drop', 'var(--accent-2)'], ['gift', 'gift', 'var(--green)'], ['train', 'dumbbell', 'var(--indigo)'], ['sleep', 'moon', 'var(--indigo)'], ['wake', 'sun', 'var(--amber)']] as [a, icon, color]}
                <button class="btn secondary" onclick={() => doInteract(a)}><Icon name={icon} size={18} {color} /> {tr(a)}</button>
              {/each}
            </div>
          </div>

        {:else if tab === 'play'}
          <div class="card play-card">
            <div class="card-head"><Icon name="puzzle" size={20} color="var(--green)" /><h3>{tr('Mini-game')}</h3></div>
            {#if !game}
              <p class="muted">{tr('Win games to boost happiness, curiosity and social stats.')}</p>
              <button class="btn" onclick={startGame}><Icon name="playCircle" size={18} color="#052420" /> {tr('New game')} ({tr(cfg.interaction.quizDifficulty)})</button>
              {#if gameResult}<p class="result">{gameResult}</p>{/if}
            {:else}
              <span class="badge">{tr('game:' + game.kind)}</span>
              <h2 style="margin:10px 0 18px;">{game.prompt}</h2>
              <div class="grid two">
                {#each game.options as opt}<button class="btn secondary opt" onclick={() => answer(opt)}>{opt}</button>{/each}
              </div>
            {/if}
          </div>

        {:else if tab === 'saves'}
          <div class="card">
            <div class="card-head"><Icon name="save" size={20} color="var(--accent-2)" /><h3>{tr('Save manager')}</h3></div>
            <div class="row wrap" style="gap:10px;">
              <button class="btn" onclick={async () => { const r = await api.backup() as any; backups = await api.backups(); flash(t('Backup') + ': ' + (r.file?.split('/').pop() ?? 'done')) }}><Icon name="save" size={18} color="#052420" /> {tr('Backup Now')}</button>
              <a class="btn secondary" href={api.exportUrl()} download><Icon name="download" size={18} color="var(--accent)" /> {tr('Export')}</a>
              <label class="btn secondary"><Icon name="upload" size={18} color="var(--accent-2)" /> {tr('Import')}<input type="file" accept=".sqlite" style="display:none" onchange={importSave} /></label>
            </div>
          </div>
          <div class="card" style="margin-top:16px;">
            <div class="card-head"><Icon name="clock" size={20} color="var(--muted)" /><h3>{tr('Backups')}</h3></div>
            {#if backups.length}
              <ul class="rows">
                {#each backups as b}<li><span class="muted" style="font-size:12px;">{b}</span><button class="btn ghost" onclick={async () => { await api.restore(b); await refreshAll(); flash(t('Restored')) }}>{tr('Restore')}</button></li>{/each}
              </ul>
            {:else}<p class="muted">{tr('No backups yet.')}</p>{/if}
          </div>

        {:else if tab === 'mods'}
          <div class="card">
            <div class="card-head" style="justify-content:space-between;">
              <div class="row" style="gap:10px;"><Icon name="cube" size={20} color="var(--indigo)" /><h3>{tr('Installed mods')}</h3></div>
              <div class="row" style="gap:8px;">
                <button class="btn secondary" onclick={() => (showModGuide = true)}><Icon name="info" size={16} color="var(--accent-2)" /> {tr('Mod guide')}</button>
                <button class="btn" onclick={() => api.openModsFolder()}><Icon name="cube" size={16} color="#052420" /> {tr('Open mods folder')}</button>
              </div>
            </div>
            <p class="muted">{tr('Drop mods into the mods/ folder in your data directory, then restart.')}</p>
            {#if modsDir}
              <div class="field" style="margin:4px 0 12px;">
                <label>{tr('Mods folder')}</label>
                <code style="display:block;word-break:break-all;">{modsDir}</code>
              </div>
            {/if}
            {#if mods.length}
              <ul class="rows">{#each mods as m}<li><span><b>{m.meta?.name ?? m.id}</b> <span class="muted">v{m.meta?.version ?? '?'}</span></span><span class="muted">{m.meta?.author ?? ''}</span></li>{/each}</ul>
            {:else}<p class="muted">{tr('No mods installed. See the Modding Guide.')}</p>{/if}
          </div>

        {:else if tab === 'settings'}
          <div class="grid two">
            <div class="card">
              <div class="card-head"><Icon name="chat" size={20} color="var(--accent-2)" /><h3>{tr('Language')}</h3></div>
              <div class="lang-row">
                {#each LANGUAGES as l}
                  <button class="lang-btn" class:sel={cfg.language === l.code} onclick={() => setLanguage(l.code)}>{l.label}</button>
                {/each}
              </div>
            </div>
            <div class="card">
              <div class="card-head"><Icon name="bell" size={20} color="var(--pink)" /><h3>{tr('Voice & commands')}</h3></div>
              <div class="switch"><span class="sw-label">🎤 {tr('Enable voice (microphone)')}</span><input type="checkbox" bind:checked={cfg.voice.enabled} onchange={saveConfig} /></div>
              <div class="field" style="margin-top:12px;"><label for="rl">{tr('Recognition language')}</label>
                <select id="rl" bind:value={cfg.voice.recognitionLang} onchange={saveConfig}>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="vi-VN">Tiếng Việt</option>
                  <option value="ja-JP">日本語</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                </select>
              </div>
              <div class="switch"><span class="sw-label"><Icon name="cube" size={18} color="var(--green)" /> {tr('Allow opening other apps')}</span><input type="checkbox" bind:checked={cfg.voice.allowAppLaunch} onchange={saveConfig} /></div>
              {#if cfg.voice.enabled && voiceUnsupported}
                <p class="muted" style="margin:10px 0 0;font-size:12px;color:var(--warn);">{tr("Speech recognition isn't available in this build — typed commands still work (e.g. \"open browser\", \"come here\").")}</p>
              {/if}
            </div>
          </div>
          <div class="grid two" style="margin-top:16px;">
            <div class="card">
              <div class="card-head"><Icon name="gear" size={20} color="var(--accent)" /><h3>{tr('Runtime')}</h3></div>
              <div class="field"><label>{tr('Simulation tick')} · {cfg.behaviour.tickMs} ms</label><input type="range" min="250" max="3000" step="50" bind:value={cfg.behaviour.tickMs} onchange={saveConfig} /></div>
              <div class="field"><label>{tr('Auto-save every')} · {cfg.system.autosaveSeconds}s</label><input type="range" min="5" max="120" step="5" bind:value={cfg.system.autosaveSeconds} onchange={saveConfig} /></div>
              <div class="field"><label for="port">{tr('Control-panel port (restart to apply)')}</label><input id="port" type="number" bind:value={cfg.system.apiPort} onchange={saveConfig} /></div>
              <div class="switch"><span class="sw-label"><Icon name="power" size={18} color="var(--green)" /> {tr('Launch on login (autostart)')}</span><input type="checkbox" bind:checked={cfg.system.autostart} onchange={async () => { await api.autostart(cfg!.system.autostart); flash(t('Autostart updated')) }} /></div>
            </div>
            <div class="card">
              <div class="card-head"><Icon name="eye" size={20} color="var(--pink)" /><h3>{tr('Accessibility')}</h3></div>
              <div class="switch"><span class="sw-label"><Icon name="bolt" size={18} color="var(--amber)" /> {tr('Reduced motion')}</span><input type="checkbox" bind:checked={cfg.accessibility.reducedMotion} onchange={saveConfig} /></div>
              <div class="switch"><span class="sw-label"><Icon name="palette" size={18} color="var(--accent-2)" /> {tr('High contrast UI')}</span><input type="checkbox" bind:checked={cfg.accessibility.highContrast} onchange={saveConfig} /></div>
              <div class="field" style="margin-top:14px;"><label>{tr('UI scale')} · {cfg.accessibility.uiScale.toFixed(2)}×</label><input type="range" min="0.8" max="1.6" step="0.05" bind:value={cfg.accessibility.uiScale} onchange={saveConfig} /></div>
            </div>
          </div>

          <div class="card" style="margin-top:16px;">
            <div class="card-head" style="justify-content:space-between;">
              <div class="row" style="gap:10px;"><Icon name="download" size={20} color="var(--accent)" /><h3>{tr('Updates')}</h3></div>
              <div class="row" style="gap:8px;">
                {#if upd.phase === 'available'}
                  <button class="btn" onclick={() => api.updateInstall()}><Icon name="download" size={16} color="#052420" /> {tr('Download & install')}</button>
                {:else}
                  <button class="btn secondary" disabled={upd.phase === 'checking' || upd.phase === 'downloading' || upd.phase === 'installing'} onclick={checkUpdate}><Icon name="download" size={16} color="var(--accent)" /> {tr('Check for updates')}</button>
                {/if}
              </div>
            </div>
            <p class="muted" style="margin:0;">{tr('Current version')}: <b>{upd.current ?? '—'}</b></p>
            {#if updStatus()}
              <p class="muted" style="margin:8px 0 0;font-size:13px;">{updStatus()}</p>
            {/if}
            {#if upd.phase === 'downloading' || upd.phase === 'installing'}
              <div class="progress" style="margin-top:10px;"><span style={`width:${upd.percent ?? (upd.phase === 'installing' ? 100 : 0)}%`}></span></div>
            {/if}
          </div>

        {:else if tab === 'developer'}
          <div class="grid two">
            <div class="card">
              <div class="card-head"><Icon name="bolt" size={20} color="var(--accent)" /><h3>{tr('Performance')}</h3></div>
              {#if metrics}
                <div class="metrics">
                  <div class="metric"><span class="muted">{tr('Uptime')}</span><b>{fmtDuration(metrics.uptimeMs)}</b></div>
                  <div class="metric"><span class="muted">{tr('Ticks')}</span><b>{metrics.ticks}</b></div>
                  <div class="metric"><span class="muted">RSS</span><b>{metrics.rssMb} MB</b></div>
                  <div class="metric"><span class="muted">Heap</span><b>{metrics.heapMb} MB</b></div>
                  <div class="metric"><span class="muted">{tr('Tick')}</span><b>{metrics.tickMs} ms</b></div>
                  <div class="metric"><span class="muted">DB</span><b>{(metrics.dbBytes / 1024).toFixed(1)} KB</b></div>
                </div>
              {/if}
            </div>
            <div class="card">
              <div class="card-head"><Icon name="code" size={20} color="var(--accent-2)" /><h3>{tr('Current state')}</h3></div>
              <pre class="json">{JSON.stringify({ state: snap.state, emotion: snap.emotion, asleep: snap.asleep, pos: snap.position, target: snap.target }, null, 2)}</pre>
            </div>
          </div>
          <div class="card" style="margin-top:16px;">
            <div class="card-head"><Icon name="code" size={20} color="var(--muted)" /><h3>{tr('Logs')}</h3></div>
            <pre class="json logs">{logs.join('\n') || tr('Logs refresh every 3s on this tab…')}</pre>
          </div>

        {:else if tab === 'about'}
          <div class="card">
            <div class="card-head"><Icon name="info" size={20} color="var(--accent)" /><h3>{tr('About petTaTo')}</h3></div>
            <p>{tr('A fully offline desktop virtual pet. No cloud, no accounts, no telemetry — everything stays on your machine.')}</p>
            <p class="muted">Electron + SQLite · Svelte + TypeScript</p>
            <p class="muted">{tr('Version')} 1.0.0</p>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  {#if showGuide}
    <div class="modal-backdrop" onclick={() => (showGuide = false)} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div class="card-head" style="justify-content:space-between;">
          <div class="row" style="gap:10px;"><Icon name="info" size={20} color="var(--accent-2)" /><h3>{tr('How to make a sprite pack')}</h3></div>
          <button class="btn ghost" onclick={() => (showGuide = false)}>✕</button>
        </div>
        <p class="muted">{tr('A sprite pack is a folder with a manifest.json and one horizontal PNG strip per animation. Click Import sprite pack and choose that folder.')}</p>
        <ol class="guide">
          <li>{tr('Each animation PNG is a horizontal strip of frames, all the same size (e.g. 80×80 or 128×128 — any size works).')}</li>
          <li>{tr('manifest.json declares the frame size and animations:')}</li>
        </ol>
        <pre class="json">{`{
  "version": 1,
  "name": "mypet",
  "title": "My Pet",
  "frameWidth": 96,
  "frameHeight": 96,
  "animations": {
    "idle":     { "file": "idle.png",  "frames": 4, "fps": 5,  "loop": true },
    "walk":     { "file": "walk.png",  "frames": 6, "fps": 10, "loop": true },
    "run":      { "file": "run.png",   "frames": 6, "fps": 14, "loop": true },
    "sleeping": { "file": "sleep.png", "frames": 4, "fps": 3,  "loop": true }
  },
  "house": "house.png",
  "icon": "icon.png"
}`}</pre>
        <p class="muted">{tr('Required animations: idle, walk, run, jump, sleeping, happy, excited, sad, hungry, talking, playing, eating, sick, exploring, sitting, bored, returningHome. Missing ones fall back to idle. Run npm run gen:assets to produce a reference pack you can edit.')}</p>
      </div>
    </div>
  {/if}

  {#if showModGuide}
    <div class="modal-backdrop" onclick={() => (showModGuide = false)} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div class="card-head" style="justify-content:space-between;">
          <div class="row" style="gap:10px;"><Icon name="cube" size={20} color="var(--indigo)" /><h3>{tr('How to install a mod')}</h3></div>
          <button class="btn ghost" onclick={() => (showModGuide = false)}>✕</button>
        </div>
        <p class="muted">{tr('Create a folder inside mods/ and drop a mod.json into it, then restart petTaTo.')}</p>
        <p class="muted" style="margin:10px 0 4px;">{tr('Your mods folder is located at:')}</p>
        <ul class="guide">
          <li>Linux: <code>~/.config/petTaTo/mods/</code></li>
          <li>Windows: <code>%APPDATA%/petTaTo/mods/</code></li>
          <li>macOS: <code>~/Library/Application Support/petTaTo/mods/</code></li>
        </ul>
        <pre class="json">{`my-mod/
  mod.json

mod.json:
{
  "id": "my-mod",
  "name": "My Cool Mod",
  "version": "1.0.0",
  "author": "you",
  "personalities": [
    { "id": "zen", "name": "Zen", "activityRate": 0.6,
      "happinessDecay": 0.6, "socialNeed": 0.7,
      "exploration": 0.8, "talkativeness": 0.4, "tone": "serene" }
  ],
  "dialogue": ["Breathe in… breathe out… hello {name}."],
  "spritePacks": ["sprites/myanimals"]
}`}</pre>
        <p class="muted" style="margin-top:10px;">{tr('A mod can add:')}</p>
        <ul class="guide">
          <li>{tr('Custom personalities — selectable in the Pet tab.')}</li>
          <li>{tr('Extra dialogue lines your pet says.')}</li>
          <li>{tr('Sprite & house packs — new looks for your pet.')}</li>
        </ul>
        <p class="muted">{tr('Restart petTaTo after adding or removing a mod.')}</p>
      </div>
    </div>
  {/if}

  {#if toast}<div class="toast">{toast}</div>{/if}
</div>
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 244px 1fr;
    height: 100vh;
    overflow: hidden;
  }

  /* sidebar */
  aside {
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 4px 6px 8px;
  }
  .brand-badge {
    width: 44px;
    height: 44px;
    border-radius: 13px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--indigo) 30%, transparent));
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
  }
  .brand-name {
    font-weight: 800;
    font-size: 17px;
  }
  .brand-sub {
    font-size: 11px;
    color: var(--muted);
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 11px;
    background: transparent;
    border: none;
    color: var(--muted);
    text-align: left;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s, color 0.15s;
  }
  nav button:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }
  nav button.active {
    background: color-mix(in srgb, var(--c) 14%, transparent);
    color: var(--text);
    font-weight: 600;
    box-shadow: inset 3px 0 0 var(--c);
  }
  .side-status {
    padding: 12px !important;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--good);
    box-shadow: 0 0 8px var(--good);
    flex-shrink: 0;
  }
  .dot.sleep {
    background: var(--indigo);
    box-shadow: 0 0 8px var(--indigo);
  }
  .ss-name {
    font-weight: 600;
    font-size: 14px;
  }
  .ss-mood {
    font-size: 12px;
    text-transform: capitalize;
  }

  /* main */
  main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 28px;
    border-bottom: 1px solid var(--line);
  }
  .page-ic {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
  }
  .mood-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 6px 13px;
    font-size: 13px;
    text-transform: capitalize;
    color: var(--text);
  }
  .mp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .qbtn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    display: grid;
    place-items: center;
    transition: transform 0.12s, border-color 0.15s, background 0.15s;
  }
  .qbtn:hover {
    transform: translateY(-2px);
    border-color: var(--line-strong);
    background: color-mix(in srgb, var(--panel-2) 75%, white 8%);
  }
  .content {
    padding: 22px 28px 40px;
    overflow-y: auto;
  }

  /* hero */
  .hero {
    background: linear-gradient(135deg, color-mix(in srgb, var(--indigo) 10%, var(--panel)), var(--panel));
  }
  .hero-pet {
    display: flex;
    gap: 24px;
    align-items: center;
  }
  .pet-stage {
    width: 160px;
    height: 160px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 70%, rgba(95, 208, 197, 0.16), transparent 65%);
    border: 1px solid var(--line);
    flex-shrink: 0;
  }
  .pet-meta h2 {
    margin: 0 0 10px;
    font-size: 24px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 4px 11px;
    font-size: 12.5px;
    text-transform: capitalize;
  }
  .chip.soft {
    background: rgba(255, 255, 255, 0.03);
  }
  .chip b {
    color: var(--accent);
  }

  .grid.two {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 920px) {
    .grid.two {
      grid-template-columns: 1fr;
    }
    .hero-pet {
      flex-direction: column;
      text-align: center;
    }
  }

  /* timeline */
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .timeline li {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
    font-size: 13px;
  }
  .timeline li:last-child {
    border-bottom: none;
  }
  .tl-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }
  .tl-text {
    flex: 1;
  }
  .tl-time {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .rows li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--line);
    font-size: 13.5px;
  }
  .rows li:last-child {
    border-bottom: none;
  }

  .play-card {
    text-align: center;
    max-width: 560px;
    margin: 0 auto;
  }
  .play-card .card-head {
    justify-content: center;
  }
  .badge {
    display: inline-block;
    background: color-mix(in srgb, var(--green) 22%, transparent);
    color: var(--green);
    padding: 3px 12px;
    border-radius: 20px;
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .opt {
    justify-content: center;
    padding: 14px;
    font-size: 15px;
  }
  .result {
    margin-top: 16px;
    font-size: 16px;
  }

  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .metric {
    display: flex;
    justify-content: space-between;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 11px 13px;
    font-size: 13px;
  }
  .json {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 13px;
    font-size: 12px;
    overflow: auto;
    max-height: 320px;
    white-space: pre-wrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  .logs {
    max-height: 360px;
  }

  .connecting {
    display: grid;
    place-items: center;
    height: 100%;
  }
  .spinner {
    width: 34px;
    height: 34px;
    margin: 0 auto;
    border-radius: 50%;
    border: 3px solid var(--track);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* pet gallery */
  .pet-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  .pet-tile {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 12px 8px;
    cursor: pointer;
    transition: transform 0.12s, border-color 0.15s;
    text-align: center;
  }
  .pet-tile:hover {
    transform: translateY(-2px);
    border-color: var(--line-strong);
  }
  .pet-tile.sel {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .tile-stage {
    height: 76px;
    display: grid;
    place-items: center;
  }
  .tile-name {
    font-size: 13px;
    font-weight: 600;
    margin-top: 4px;
  }
  .tile-meta {
    font-size: 11px;
  }

  /* segmented control */
  .seg {
    display: flex;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 4px;
  }
  .seg button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: var(--muted);
    border-radius: 8px;
    padding: 9px 10px;
    font-size: 13px;
    font-weight: 500;
  }
  .seg button.sel {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
    font-weight: 600;
  }

  /* update progress bar */
  .progress {
    height: 8px;
    border-radius: 6px;
    background: var(--track);
    overflow: hidden;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--accent);
    border-radius: 6px;
    transition: width 0.2s ease;
  }

  /* language buttons */
  .lang-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .lang-btn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    color: var(--text);
    border-radius: 10px;
    padding: 9px 16px;
    font-size: 14px;
  }
  .lang-btn.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    font-weight: 600;
  }

  /* modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 24px;
  }
  .modal {
    background: var(--panel-solid);
    border: 1px solid var(--line-strong);
    border-radius: 16px;
    padding: 22px;
    max-width: 560px;
    width: 100%;
    max-height: 86vh;
    overflow-y: auto;
    box-shadow: var(--shadow);
  }
  .guide {
    padding-left: 18px;
    font-size: 13.5px;
    line-height: 1.6;
  }
  code {
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 5px;
    border-radius: 5px;
    font-size: 12px;
  }

  .toast {
    position: fixed;
    bottom: 22px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--panel-solid);
    border: 1px solid var(--line-strong);
    color: var(--text);
    padding: 11px 20px;
    border-radius: 24px;
    box-shadow: var(--shadow);
    font-size: 14px;
    z-index: 50;
  }
</style>
