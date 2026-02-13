<script lang="ts">
  import { appIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import type { Server } from '$lib/stores/servers';
  import AppIcon from './ui/AppIcon.svelte';

  let { 
    server, 
    onStart,
    onStop,
    onDelete 
  }: { 
    server: Server; 
    onStart: () => void;
    onStop: () => void;
    onDelete: () => void;
  } = $props();

  let isRunning = $derived(server.status === 'running');
</script>

<div class="server-card" class:running={isRunning}>
  <div class="server-card-header">
    <div class="server-icon">
      <img src="/images/favicon.ico" alt="Server" />
    </div>
    <div class="server-info">
      <h3 class="server-name">{server.name}</h3>
      <div class="server-meta">
        <span class="server-port">:{server.port}/UDP</span>
        <span class="server-container">{server.containerName}</span>
      </div>
    </div>
    <div class="server-status">
      <span class="status-dot" class:online={isRunning}></span>
      <span class="status-text">{isRunning ? $_('online') : $_('offline')}</span>
    </div>
  </div>

  <div class="server-card-config">
    <div class="config-item">
      <span class="config-label">RAM</span>
      <span class="config-value">{server.config.javaXms} - {server.config.javaXmx}</span>
    </div>
    <div class="config-item">
      <span class="config-label">G1GC</span>
      <span class="config-value">{server.config.useG1gc ? 'ON' : 'OFF'}</span>
    </div>
  </div>

  <div class="server-card-actions">
    <button class="mc-btn small" onclick={onStart} disabled={isRunning}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={appIcons.start} size={16} />
        <span>{$_('start')}</span>
      </span>
    </button>
    <button class="mc-btn small warning" onclick={onStop} disabled={!isRunning}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={appIcons.stop} size={16} />
        <span>{$_('stop')}</span>
      </span>
    </button>
    <button class="mc-btn small danger" onclick={onDelete}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={appIcons.delete} size={16} />
        <span>{$_('delete')}</span>
      </span>
    </button>
  </div>
</div>
