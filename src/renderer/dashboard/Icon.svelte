<script lang="ts" module>
  // Duotone SVG icon library. Each icon has two layers that both use
  // `currentColor`: a soft background (.b, low opacity) and a crisp foreground
  // (.f). Passing a `color` tints the whole icon, giving the coloured-duotone
  // look. All icons are hand-built on a 24×24 grid — no external assets.
  export const ICONS: Record<string, string> = {
    grid: `<rect class="b" x="3" y="3" width="8" height="8" rx="2.4"/><rect class="b" x="13" y="13" width="8" height="8" rx="2.4"/><rect class="f" x="13" y="3" width="8" height="8" rx="2.4"/><rect class="f" x="3" y="13" width="8" height="8" rx="2.4"/>`,
    paw: `<ellipse class="b" cx="12" cy="15.5" rx="5.2" ry="4"/><circle class="f" cx="6.6" cy="9.5" r="1.8"/><circle class="f" cx="11" cy="7.4" r="1.9"/><circle class="f" cx="15.6" cy="8.4" r="1.8"/><circle class="f" cx="18.4" cy="12" r="1.5"/>`,
    palette: `<path class="b" d="M12 3a9 9 0 0 0 0 18c1.8 0 2.2-1.3 1.3-2.3-.9-1 .1-2.5 1.4-2.5H17a4 4 0 0 0 4-4c0-5-4-9.2-9-9.2Z"/><circle class="f" cx="8" cy="11" r="1.3"/><circle class="f" cx="12" cy="8.5" r="1.3"/><circle class="f" cx="16" cy="11" r="1.3"/>`,
    controller: `<rect class="b" x="2" y="7" width="20" height="11" rx="5.5"/><rect class="f" x="6" y="11.4" width="4" height="1.6" rx=".8"/><rect class="f" x="7.2" y="10.2" width="1.6" height="4" rx=".8"/><circle class="f" cx="16" cy="11.4" r="1.1"/><circle class="f" cx="18.4" cy="13.6" r="1.1"/>`,
    puzzle: `<path class="b" d="M4 4h6v1.6a2 2 0 1 0 4 0V4h6v6h-1.6a2 2 0 1 0 0 4H20v6h-6v-1.6a2 2 0 1 0-4 0V20H4v-6h1.6a2 2 0 1 0 0-4H4V4Z"/><circle class="f" cx="12" cy="12" r="2"/>`,
    save: `<path class="b" d="M4 4h12l4 4v12H4V4Z"/><rect class="f" x="8" y="4" width="6" height="5" rx="1"/><rect class="f" x="7" y="13" width="10" height="6" rx="1"/>`,
    cube: `<path class="b" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path class="f" d="M12 3.4l7.6 4.3L12 12 4.4 7.7 12 3.4Z"/><path class="f" d="M12 12v8.2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    code: `<rect class="b" x="2" y="4" width="20" height="16" rx="3.5"/><path class="f" d="M9 10l-2 2 2 2M15 10l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    info: `<circle class="b" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="8" r="1.25"/><rect class="f" x="11" y="11" width="2" height="6" rx="1"/>`,
    gear: `<circle class="b" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path class="f" d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    sliders: `<rect class="b" x="3" y="4" width="18" height="16" rx="3.5"/><path class="f" d="M8 8v8M16 8v8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle class="f" cx="8" cy="13.5" r="2"/><circle class="f" cx="16" cy="10.5" r="2"/>`,
    heart: `<path class="b" d="M12 21s-7.2-4.6-9.4-9C1.2 8.6 3 5 6.3 5 8.3 5 11 6.6 12 8.7 13 6.6 15.7 5 17.7 5 21 5 22.8 8.6 21.4 12 19.2 16.4 12 21 12 21Z"/><path class="f" d="M6.8 9.2C7.4 8.1 8.4 7.5 9.5 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
    bowl: `<path class="b" d="M3 11h18a9 9 0 0 1-18 0Z"/><circle class="f" cx="9" cy="7" r="1.4"/><circle class="f" cx="13" cy="5.8" r="1.4"/><circle class="f" cx="16" cy="8" r="1.2"/>`,
    drop: `<path class="b" d="M12 3s6 6.7 6 11a6 6 0 0 1-12 0c0-4.3 6-11 6-11Z"/><path class="f" d="M9 14.5a3 3 0 0 0 3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    moon: `<path class="b" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/><circle class="f" cx="17.5" cy="6" r="1"/><circle class="f" cx="14.5" cy="3.8" r=".7"/>`,
    sun: `<circle class="b" cx="12" cy="12" r="5"/><path class="f" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    chat: `<path class="b" d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9.5L5 19.5V6a1 1 0 0 1 1-1Z"/><circle class="f" cx="9" cy="10.5" r="1.1"/><circle class="f" cx="12.5" cy="10.5" r="1.1"/><circle class="f" cx="16" cy="10.5" r="1.1"/>`,
    gift: `<rect class="b" x="3" y="9" width="18" height="11" rx="2"/><rect class="f" x="11" y="9" width="2" height="11"/><path class="f" d="M12 9C11 5.8 6.6 6 6.6 8c0 1.7 4 1 5.4 1Zm0 0c1-3.2 5.4-3 5.4-1 0 1.7-4 1-5.4 1Z"/>`,
    dumbbell: `<rect class="b" x="8.5" y="10" width="7" height="4" rx="1.2"/><rect class="f" x="3" y="8" width="3.2" height="8" rx="1.2"/><rect class="f" x="17.8" y="8" width="3.2" height="8" rx="1.2"/>`,
    sparkle: `<path class="b" d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/><path class="f" d="M18.5 3.5l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4Z"/>`,
    playCircle: `<circle class="b" cx="12" cy="12" r="9"/><path class="f" d="M10 8.2l6 3.8-6 3.8V8.2Z"/>`,
    bell: `<path class="b" d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.8 1.8a.6.6 0 0 1-.4 1H4.6a.6.6 0 0 1-.4-1L6 16.5Z"/><path class="f" d="M10 19.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
    monitor: `<rect class="b" x="3" y="4" width="18" height="12" rx="2.5"/><rect class="f" x="9" y="17.6" width="6" height="1.6" rx=".8"/><rect class="f" x="7" y="19" width="10" height="1.5" rx=".75"/>`,
    bolt: `<path class="b" d="M13 2L4 13.5h6.2L9 22l9-12h-6.3L13 2Z"/><path class="f" d="M11.5 9.5l-1 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
    clock: `<circle class="b" cx="12" cy="12" r="9"/><path class="f" d="M12 7v5l3.2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    sprout: `<path class="b" d="M12 21V11c0-3 2-6 6-6 0 3.5-2.6 6-6 6"/><path class="b" d="M12 14C8.7 14 6 11.5 6 8c3.4 0 6 3 6 6Z"/><path class="f" d="M12 21v-7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    refresh: `<path class="b" d="M12 4a8 8 0 1 0 7.5 5.3"/><path class="f" d="M20 3v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="f" d="M12 4a8 8 0 0 0-7.5 5.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0"/>`,
    download: `<path class="b" d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path class="f" d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    upload: `<path class="b" d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path class="f" d="M12 16V6m0 0L8.5 9.5M12 6l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    power: `<circle class="b" cx="12" cy="12" r="9"/><path class="f" d="M12 6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="f" d="M8.5 8.5a5 5 0 1 0 7 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
    eye: `<path class="b" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle class="f" cx="12" cy="12" r="3"/>`,
    cursor: `<path class="b" d="M6 4l13 6-5.5 1.8L12 18 6 4Z"/><path class="f" d="M13.5 11.8L18 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
    pin: `<path class="b" d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle class="f" cx="12" cy="10" r="2.6"/>`,
    star: `<path class="b" d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6-4.5-4.1 6.1-.7L12 3Z"/>`,
    plus: `<circle class="b" cx="12" cy="12" r="9"/><path class="f" d="M12 8v8M8 12h8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`
  }
</script>

<script lang="ts">
  let { name, size = 22, color = 'currentColor' }: { name: string; size?: number; color?: string } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  style={`color:${color}`}
  aria-hidden="true"
>
  {@html ICONS[name] ?? ICONS.info}
</svg>

<style>
  svg :global(.b) {
    fill: currentColor;
    opacity: 0.26;
  }
  svg :global(.f) {
    fill: currentColor;
  }
</style>
