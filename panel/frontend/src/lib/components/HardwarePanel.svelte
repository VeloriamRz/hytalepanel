<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { isConnected } from '$lib/services/socketClient';
  import { hardware } from '$lib/stores/hardware';
  import Sparkline from './ui/Sparkline.svelte';
  
  interface Props {
    enabled: boolean;
  }

  let { enabled }: Props = $props();

  function fmtPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return `${value.toFixed(1)}%`;
  }

  function fmtMb(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return `${value.toFixed(0)} MB`;
  }
</script>

<section class="vault-hardware-panel">
  <div class="vault-hardware-header">
    <h3>{$_('hardwareMonitor')}</h3>
    {#if enabled}
      <span class="vault-hardware-live">{$_('live')}</span>
    {/if}
  </div>

  {#if !enabled}
    <div class="vault-hardware-empty">{$_('hardwareRequiresRunningServer')}</div>
  {:else if !$isConnected}
    <div class="vault-hardware-empty">{$_('disconnected')}</div>
  {:else if $hardware.current}
    <div class="vault-hardware-grid">
      <article class="vault-hardware-item">
        <div class="vault-hardware-row">
          <span>{$_('cpuUsage')}</span>
          <strong>{fmtPercent($hardware.current.cpuPercent)}</strong>
        </div>
        <Sparkline values={$hardware.history.cpu} stroke="#d26f7f" fill="rgba(210, 111, 127, 0.2)" />
      </article>

      <article class="vault-hardware-item">
        <div class="vault-hardware-row">
          <span>{$_('memoryUsage')}</span>
          <strong>{fmtPercent($hardware.current.memoryPercent)}</strong>
        </div>
        <Sparkline values={$hardware.history.memory} stroke="#8b9dd6" fill="rgba(139, 157, 214, 0.2)" />
        <div class="vault-hardware-meta">
          {fmtMb($hardware.current.memoryUsedMb)} / {fmtMb($hardware.current.memoryTotalMb)}
        </div>
      </article>
    </div>
  {:else}
    <div class="vault-hardware-empty">{$_('loading')}</div>
  {/if}
</section>
