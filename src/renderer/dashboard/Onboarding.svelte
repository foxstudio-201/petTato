<script lang="ts">
  import type { AppConfig } from '../../shared/types'
  import { api, API_BASE } from './api'
  import { T, LANGUAGES } from './i18n'
  import SpritePreview from './SpritePreview.svelte'
  import Icon from './Icon.svelte'

  let { cfg, packs, onDone }: { cfg: AppConfig; packs: any[]; onDone: () => void } = $props()

  let step = $state(0)
  let lang = $state(cfg.language || 'en')
  let ownerName = $state(cfg.ownerName || '')
  let petName = $state('')
  let species = $state(cfg.appearance.spritePack && cfg.appearance.spritePack !== 'default' ? cfg.appearance.spritePack : 'tato')
  let freeRoam = $state(cfg.behaviour.freeRoam)
  let busy = $state(false)

  const tr = (s: string) => T(lang, s)
  const STEPS = 5

  function next() {
    if (step < STEPS - 1) step++
  }
  function back() {
    if (step > 0) step--
  }

  async function finish() {
    busy = true
    await api.settings({
      language: lang,
      ownerName: ownerName.trim(),
      onboarded: true,
      appearance: { ...cfg.appearance, spritePack: species },
      behaviour: { ...cfg.behaviour, freeRoam },
      voice: { ...cfg.voice, recognitionLang: LANGUAGES.find((l) => l.code === lang)?.recognition ?? cfg.voice.recognitionLang }
    } as Partial<AppConfig>)
    if (petName.trim()) await api.rename(petName.trim())
    onDone()
  }

  // a tiny pseudo-snapshot so SpritePreview can animate the chosen species
  let previewSnap = $derived({ state: 'idle', asleep: false, facing: 1 } as any)
</script>

<div class="ob">
  <div class="ob-bg"></div>
  <div class="ob-card">
    <div class="logo">
      <img src={`${API_BASE}/assets-gen/${step >= 3 ? species : 'tato'}/icon.png`} alt="petTaTo" />
      <div class="ring"></div>
    </div>

    {#if step === 0}
      <h1>petTaTo</h1>
      <p class="sub">{lang === 'vi' ? 'Người bạn ảo sống trên màn hình của bạn' : 'A little companion that lives on your desktop'}</p>
      <div class="lang-pick">
        {#each LANGUAGES as l}
          <button class="lang" class:sel={lang === l.code} onclick={() => (lang = l.code)}>{l.label}</button>
        {/each}
      </div>
      <button class="cta" onclick={next}>{lang === 'vi' ? 'Bắt đầu' : 'Get started'} →</button>
    {:else if step === 1}
      <h2>{lang === 'vi' ? 'Tên của bạn là gì?' : "What's your name?"}</h2>
      <p class="sub">{lang === 'vi' ? 'Thú cưng sẽ gọi tên bạn khi trò chuyện.' : 'Your pet will call you by name.'}</p>
      <input class="big-input" bind:value={ownerName} placeholder={lang === 'vi' ? 'Tên chủ' : 'Your name'} onkeydown={(e) => e.key === 'Enter' && next()} />
      <div class="nav"><button class="ghost" onclick={back}>←</button><button class="cta" onclick={next}>{lang === 'vi' ? 'Tiếp' : 'Next'} →</button></div>
    {:else if step === 2}
      <h2>{lang === 'vi' ? 'Đặt tên cho thú cưng' : 'Name your pet'}</h2>
      <input class="big-input" bind:value={petName} placeholder={lang === 'vi' ? 'Tên thú cưng' : 'Pet name'} onkeydown={(e) => e.key === 'Enter' && next()} />
      <div class="nav"><button class="ghost" onclick={back}>←</button><button class="cta" onclick={next}>{lang === 'vi' ? 'Tiếp' : 'Next'} →</button></div>
    {:else if step === 3}
      <h2>{lang === 'vi' ? 'Chọn thú cưng' : 'Choose your pet'}</h2>
      <div class="gallery">
        {#each packs.filter((p) => !p.imported) as p}
          <button class="tile" class:sel={species === p.name} onclick={() => (species = p.name)}>
            <div class="tile-stage"><SpritePreview snap={previewSnap} size={70} pack={p.name} /></div>
            <div class="tile-name">{p.title}</div>
          </button>
        {/each}
      </div>
      <div class="nav"><button class="ghost" onclick={back}>←</button><button class="cta" onclick={next}>{lang === 'vi' ? 'Tiếp' : 'Next'} →</button></div>
    {:else if step === 4}
      <h2>{lang === 'vi' ? 'Kiểu di chuyển' : 'Movement style'}</h2>
      <div class="move-pick">
        <button class:sel={!freeRoam} onclick={() => (freeRoam = false)}>
          <Icon name="monitor" size={28} color={!freeRoam ? 'var(--accent)' : 'var(--muted)'} />
          <b>{lang === 'vi' ? 'Mặt đất' : 'Ground'}</b>
          <span>{lang === 'vi' ? 'Đi dọc đáy màn hình' : 'Walks along the bottom'}</span>
        </button>
        <button class:sel={freeRoam} onclick={() => (freeRoam = true)}>
          <Icon name="sparkle" size={28} color={freeRoam ? 'var(--green)' : 'var(--muted)'} />
          <b>{lang === 'vi' ? 'Toàn màn hình' : 'Whole screen'}</b>
          <span>{lang === 'vi' ? 'Đi đến bất kỳ đâu' : 'Roams anywhere'}</span>
        </button>
      </div>
      <div class="nav">
        <button class="ghost" onclick={back}>←</button>
        <button class="cta" disabled={busy} onclick={finish}>{busy ? '…' : lang === 'vi' ? 'Hoàn tất ✓' : 'Finish ✓'}</button>
      </div>
    {/if}

    <div class="dots">
      {#each Array(STEPS) as _, i}<span class:on={i === step}></span>{/each}
    </div>
  </div>
</div>

<style>
  .ob {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .ob-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(800px 500px at 20% 10%, rgba(122, 162, 255, 0.25), transparent 60%),
      radial-gradient(700px 500px at 85% 90%, rgba(95, 208, 197, 0.22), transparent 60%),
      linear-gradient(160deg, #131a2e, #0a0e18);
    animation: drift 12s ease-in-out infinite alternate;
  }
  @keyframes drift {
    to {
      filter: hue-rotate(20deg);
    }
  }
  .ob-card {
    position: relative;
    width: min(520px, 92vw);
    background: var(--panel);
    backdrop-filter: blur(20px);
    border: 1px solid var(--line-strong);
    border-radius: 24px;
    padding: 36px 32px 26px;
    text-align: center;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
    animation: rise 0.5s cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
  }
  .logo {
    position: relative;
    width: 96px;
    height: 96px;
    margin: 0 auto 14px;
  }
  .logo img {
    width: 96px;
    height: 96px;
    border-radius: 24px;
    image-rendering: auto;
    animation: bob 2.4s ease-in-out infinite;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }
  @keyframes bob {
    50% {
      transform: translateY(-8px) rotate(-2deg);
    }
  }
  .ring {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 2px dashed color-mix(in srgb, var(--accent) 50%, transparent);
    animation: spin 9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  h1 {
    font-size: 34px;
    margin: 6px 0 4px;
    letter-spacing: -0.02em;
  }
  h2 {
    font-size: 22px;
    margin: 6px 0 8px;
  }
  .sub {
    color: var(--muted);
    margin: 0 0 18px;
  }
  .lang-pick,
  .move-pick {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 18px;
  }
  .lang {
    background: var(--panel-2);
    border: 1px solid var(--line);
    color: var(--text);
    border-radius: 12px;
    padding: 10px 18px;
    font-size: 15px;
  }
  .lang.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }
  .big-input {
    width: 100%;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 14px;
    color: var(--text);
    padding: 14px 16px;
    font-size: 17px;
    text-align: center;
    outline: none;
    margin-bottom: 18px;
  }
  .big-input:focus {
    border-color: var(--accent);
  }
  .cta {
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, white), var(--accent));
    color: #052420;
    border: none;
    border-radius: 14px;
    padding: 13px 26px;
    font-weight: 700;
    font-size: 16px;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .cta:disabled {
    opacity: 0.6;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    color: var(--text);
    border-radius: 14px;
    padding: 13px 20px;
    font-size: 16px;
  }
  .nav {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .tile {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 8px 4px;
    cursor: pointer;
  }
  .tile.sel {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .tile-stage {
    height: 74px;
    display: grid;
    place-items: center;
  }
  .tile-name {
    font-size: 12px;
    font-weight: 600;
  }
  .move-pick button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 18px;
    color: var(--text);
    cursor: pointer;
  }
  .move-pick button.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .move-pick b {
    font-size: 15px;
  }
  .move-pick span {
    font-size: 12px;
    color: var(--muted);
  }
  .dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-top: 22px;
  }
  .dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--line-strong);
  }
  .dots span.on {
    background: var(--accent);
    width: 20px;
    border-radius: 4px;
  }
</style>
