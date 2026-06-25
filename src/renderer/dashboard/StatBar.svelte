<script lang="ts">
  import Icon from './Icon.svelte'

  let {
    label,
    value,
    icon = 'sparkle',
    color = 'var(--accent)'
  }: { label: string; value: number; icon?: string; color?: string } = $props()

  let v = $derived(Math.max(0, Math.min(100, value)))
  let tone = $derived(v < 25 ? 'var(--bad)' : v < 50 ? 'var(--warn)' : color)
</script>

<div class="stat">
  <div class="ic" style={`background:color-mix(in srgb, ${tone} 18%, transparent); color:${tone}`}>
    <Icon name={icon} size={18} />
  </div>
  <div class="body">
    <div class="top">
      <span class="lbl">{label}</span>
      <span class="val">{Math.round(value)}</span>
    </div>
    <div class="track">
      <div class="fill" style={`width:${v}%; background:linear-gradient(90deg, color-mix(in srgb, ${tone} 55%, transparent), ${tone})`}></div>
    </div>
  </div>
</div>

<style>
  .stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .ic {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 5px;
  }
  .lbl {
    text-transform: capitalize;
    color: var(--text);
    font-weight: 500;
  }
  .val {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .track {
    height: 8px;
    background: var(--track);
    border-radius: 6px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
</style>
