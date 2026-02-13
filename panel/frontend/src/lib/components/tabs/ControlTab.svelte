<script lang="ts">
  import { appIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { emit } from '$lib/services/socketClient';
  import { serverStatus } from '$lib/stores/server';
  import { activeServer } from '$lib/stores/servers';
  import { addLog } from '$lib/stores/console';
  import AppIcon from '../ui/AppIcon.svelte';

  function handleStart(): void {
    emit('start');
  }

  function handleRestart(): void {
    if (!$serverStatus.running) return;
    if (confirm($_('confirmRestart'))) {
      emit('restart');
    }
  }

  function handleStop(): void {
    if (!$serverStatus.running) return;
    if (confirm($_('confirmStop'))) {
      addLog('> /stop', 'cmd');
      emit('command', '/stop');
    }
  }

  function handleForceStop(): void {
    if (!$serverStatus.running) return;
    if (confirm($_('confirmForceStop'))) {
      emit('kill');
    }
  }

  function handleWipe(): void {
    if ($serverStatus.running) return;
    if (confirm($_('confirmWipe'))) {
      if (confirm($_('confirmWipeSure'))) {
        emit('wipe');
      }
    }
  }
</script>

<div class="control-grid">
  <button class="mc-btn primary small" onclick={handleStart} disabled={$serverStatus.running}>
    <span style="display: inline-flex; align-items: center; gap: 8px;">
      <AppIcon name={appIcons.start} size={15} />
      <span>{$_('start')}</span>
    </span>
  </button>
  <button class="mc-btn small" onclick={handleRestart} disabled={!$serverStatus.running}>
    <span style="display: inline-flex; align-items: center; gap: 8px;">
      <AppIcon name={appIcons.refresh} size={15} />
      <span>{$_('restart')}</span>
    </span>
  </button>
</div>
<button class="mc-btn danger small" onclick={handleStop} disabled={!$serverStatus.running}>
  <span style="display: inline-flex; align-items: center; gap: 8px;">
    <AppIcon name={appIcons.stop} size={15} />
    <span>{$_('stopServer')}</span>
  </span>
</button>
<button class="mc-btn danger small" style="margin-top: 4px; opacity: 0.8;" onclick={handleForceStop} disabled={!$serverStatus.running} title={$_('forceStopTooltip')}>
  <span style="display: inline-flex; align-items: center; gap: 8px;">
    <AppIcon name={appIcons.stop} size={15} />
    <span>{$_('forceStop')}</span>
  </span>
</button>
<button class="mc-btn warning small" style="margin-top: 8px;" onclick={handleWipe} disabled={$serverStatus.running}>
  <span style="display: inline-flex; align-items: center; gap: 8px;">
    <AppIcon name={appIcons.delete} size={15} />
    <span>{$_('wipeData')}</span>
  </span>
</button>

<div class="info-compact">
  <div class="info-row">
    <span class="info-label">{$_('status')}</span>
    <span class="info-value">{$serverStatus.status}</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('game')}</span>
    <span class="info-value">{$activeServer?.port || 5520}/UDP</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('panel')}</span>
    <span class="info-value">3000/TCP</span>
  </div>
</div>
