<script lang="ts">
  import { onMount } from 'svelte'
  import type { PetSnapshot } from '../../shared/types'

  // --- reactive state ---
  let snapshot = $state<PetSnapshot | null>(null)
  let pos = $state({ x: 200, y: 400 })
  let facing = $state<1 | -1>(1)
  let scale = $state(1)
  let opacity = $state(1)
  let animSpeed = $state(1)
  let reducedMotion = $state(false)
  let bubble = $state<string | null>(null)
  let chatOpen = $state(false)
  let chatText = $state('')
  let interactive = $state(false)
  let listening = $state(false)
  let voiceEnabled = $state(false)

  let manifest: any = null
  let baseUrl = ''
  let recognitionLang = 'en-US'
  let images: Record<string, HTMLImageElement> = {}
  let frameW = 80
  let frameH = 80
  let canvas: HTMLCanvasElement
  let bubbleTimer: number | undefined
  let recognition: any = null
  const ANIM_MAP: Record<string, string> = { walking: 'walk', running: 'run', returningHome: 'walk' }

  let dragging = false
  let dragMoved = false

  function animFor(s: PetSnapshot): string {
    if (s.asleep) return 'sleeping'
    const mapped = ANIM_MAP[s.state] ?? s.state
    return manifest?.animations?.[mapped] ? mapped : 'idle'
  }

  function petW() {
    return frameW * scale
  }
  function petH() {
    return frameH * scale
  }

  function showBubble(text: string, ms = 4500) {
    bubble = text
    clearTimeout(bubbleTimer)
    bubbleTimer = window.setTimeout(() => (bubble = null), ms)
  }

  function withinPet(mx: number, my: number): boolean {
    const w = petW()
    const h = petH()
    const left = pos.x - w / 2
    const top = pos.y - h
    const pad = 16
    return mx >= left - pad && mx <= left + w + pad && my >= top - pad && my <= top + h + pad
  }

  function setInteractive(v: boolean) {
    if (v === interactive) return
    interactive = v
    window.pettato.setInteractive(v)
  }

  function loadPack(m: any, url: string) {
    if (!m || !url) return
    manifest = m
    baseUrl = url
    frameW = m.frameWidth || 80
    frameH = m.frameHeight || 80
    images = {}
    for (const a of Object.values<any>(m.animations)) {
      const img = new Image()
      img.src = `${url}/${a.file}`
      images[a.file] = img
    }
  }

  onMount(async () => {
    const init = await window.pettato.init()
    snapshot = init.snapshot
    applyAppearance(init)
    loadPack(init.manifest, init.assetsBaseUrl)
    pos = { x: init.snapshot.position.x - init.displayOrigin.x, y: init.snapshot.position.y - init.displayOrigin.y }
    facing = init.snapshot.facing

    window.pettato.onSnapshot((s) => {
      snapshot = s
      if (s.speech) showBubble(s.speech)
    })
    window.pettato.onFrame((f) => {
      pos = { x: f.x, y: f.y }
      facing = f.facing
    })
    window.pettato.onSpeech((l) => showBubble(l.text))
    window.pettato.onConfig((c) => {
      applyAppearance(c)
      if (c.manifest && c.assetsBaseUrl && c.assetsBaseUrl !== baseUrl) loadPack(c.manifest, c.assetsBaseUrl)
    })

    window.addEventListener('mousemove', onMouseMove)
    requestAnimationFrame(render)
  })

  function applyAppearance(c: any) {
    scale = c.appearance?.scale ?? scale
    opacity = c.appearance?.opacity ?? opacity
    animSpeed = c.appearance?.animationSpeed ?? animSpeed
    reducedMotion = c.accessibility?.reducedMotion ?? reducedMotion
    voiceEnabled = c.voice?.enabled ?? voiceEnabled
    recognitionLang = c.voice?.recognitionLang ?? recognitionLang
  }

  function onMouseMove(e: MouseEvent) {
    if (dragging) return
    setInteractive(withinPet(e.clientX, e.clientY) || chatOpen)
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true
    dragMoved = false
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    dragMoved = true
    pos = { x: e.clientX, y: e.clientY }
    window.pettato.drag(e.clientX, e.clientY)
  }
  function onPointerUp() {
    if (dragging && !dragMoved) {
      chatOpen = !chatOpen
      if (chatOpen) setTimeout(() => document.getElementById('chat-input')?.focus(), 30)
    }
    dragging = false
  }

  async function handleInput(text: string) {
    const t = text.trim()
    if (!t) return
    // Try a command first; fall back to plain chat.
    const res: any = await window.pettato.command(t)
    if (res && res.matched === false) {
      const line = await window.pettato.talk(t)
      if (line?.text) showBubble(line.text, 6000)
    }
    // matched commands speak via the engine (shown through onSpeech)
  }

  async function sendChat() {
    const text = chatText.trim()
    chatText = ''
    await handleInput(text)
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      showBubble("Voice isn't available in this build — please type to me!", 5000)
      return
    }
    if (listening) {
      recognition?.stop()
      return
    }
    recognition = new SR()
    recognition.lang = recognitionLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => (listening = true)
    recognition.onend = () => (listening = false)
    recognition.onerror = () => {
      listening = false
      showBubble('I had trouble hearing you.', 3500)
    }
    recognition.onresult = (ev: any) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? ''
      if (transcript) {
        showBubble('“' + transcript + '”', 3000)
        handleInput(transcript)
      }
    }
    try {
      recognition.start()
    } catch {
      listening = false
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault()
    window.pettato.contextMenu()
  }

  // --- render loop ---
  function render(t: number) {
    if (canvas && snapshot && manifest) {
      const ctx = canvas.getContext('2d')!
      const w = petW()
      const h = petH()
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = false

      const anim = animFor(snapshot)
      const meta = manifest.animations[anim]
      const img = meta && images[meta.file]
      if (img && img.complete && img.naturalWidth > 0) {
        const fps = reducedMotion ? 1.5 : meta.fps * animSpeed
        let frame = Math.floor((t / 1000) * fps)
        frame = meta.loop ? frame % meta.frames : Math.min(frame % (meta.frames * 4), meta.frames - 1)
        ctx.save()
        if (facing < 0) {
          ctx.translate(w, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(img, frame * frameW, 0, frameW, frameH, 0, 0, w, h)
        ctx.restore()
      }
    }
    requestAnimationFrame(render)
  }

  let containerStyle = $derived(
    `left:${pos.x - petW() / 2}px; top:${pos.y - petH()}px; width:${petW()}px; height:${petH()}px; opacity:${opacity};`
  )
</script>

<div class="overlay">
  {#if bubble}
    <div class="bubble" style={`left:${pos.x}px; top:${pos.y - petH() - 18}px;`}>
      {bubble}
      <span class="tail"></span>
    </div>
  {/if}

  {#if chatOpen}
    <div class="chat" style={`left:${pos.x}px; top:${pos.y + 8}px;`}>
      <input
        id="chat-input"
        bind:value={chatText}
        placeholder="Say or type…"
        onkeydown={(e) => {
          if (e.key === 'Enter') sendChat()
          if (e.key === 'Escape') chatOpen = false
        }}
      />
      {#if voiceEnabled}
        <button class="mic" class:on={listening} title="Speak" onclick={startVoice} aria-label="Voice command">
          🎤
        </button>
      {/if}
      <button onclick={sendChat}>Send</button>
    </div>
  {/if}

  <div
    class="pet"
    style={containerStyle}
    role="button"
    tabindex="0"
    aria-label={`${snapshot?.name ?? 'Pet'}, feeling ${snapshot?.emotion ?? ''}`}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    oncontextmenu={onContextMenu}
  >
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: transparent;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  .pet {
    position: absolute;
    cursor: grab;
    image-rendering: pixelated;
    transition: opacity 0.3s;
  }
  .pet:active {
    cursor: grabbing;
  }
  canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .bubble {
    position: absolute;
    transform: translate(-50%, -100%);
    max-width: 240px;
    background: #fffefa;
    color: #1c2230;
    border: 2px solid #2b3550;
    border-radius: 14px;
    padding: 8px 12px;
    font-size: 13px;
    line-height: 1.35;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    pointer-events: none;
    white-space: pre-wrap;
  }
  .bubble .tail {
    position: absolute;
    left: 50%;
    bottom: -9px;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 9px solid #2b3550;
  }
  .chat {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    background: rgba(20, 26, 40, 0.95);
    border-radius: 10px;
    padding: 5px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  }
  .chat input {
    width: 170px;
    border: none;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 13px;
    outline: none;
  }
  .chat button {
    border: none;
    border-radius: 6px;
    background: #5fb6a6;
    color: #07221d;
    font-weight: 600;
    padding: 0 12px;
    cursor: pointer;
  }
  .chat .mic {
    background: #2b3550;
    font-size: 14px;
    padding: 0 8px;
  }
  .chat .mic.on {
    background: #ff6b7a;
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.5);
    }
  }
</style>
