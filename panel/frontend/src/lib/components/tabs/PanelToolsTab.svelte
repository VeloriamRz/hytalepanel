<script lang="ts">
  import { appIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { panelBrand } from '$lib/config/branding';
  import { clearLogs } from '$lib/stores/console';
  import { panelExpanded, showToast } from '$lib/stores/ui';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { connectSocket, emit, isConnected, leaveServer } from '$lib/services/socketClient';
  import AppIcon from '../ui/AppIcon.svelte';

  let quickCommand = $state('');

  const quickCommands = ['/help', '/list', '/save'];

  function refreshServerData(): void {
    emit('check-files');
    emit('files:list', '/');
    emit('mods:list');
    emit('mods:check-updates');
    emit('update:check');
    showToast($_('panelActionCompleted'));
  }

  function reconnectRealtime(): void {
    connectSocket();
    showToast($_('panelActionCompleted'));
  }

  function clearConsoleLogs(): void {
    clearLogs();
    showToast($_('panelActionCompleted'));
  }

  function startServer(): void {
    emit('start');
    showToast($_('panelActionCompleted'));
  }

  function restartServer(): void {
    if (!confirm($_('confirmRestart'))) return;
    emit('restart');
    showToast($_('panelActionCompleted'));
  }

  function stopServer(): void {
    if (!confirm($_('confirmStop'))) return;
    emit('command', '/stop');
    showToast($_('panelActionCompleted'));
  }

  function sendQuickCommand(): void {
    const cmd = quickCommand.trim();
    if (!cmd) return;
    emit('command', cmd);
    quickCommand = '';
    showToast($_('panelActionCompleted'));
  }

  function runPresetCommand(cmd: string): void {
    emit('command', cmd);
    showToast($_('panelActionCompleted'));
  }

  function toggleExpandedPanel(): void {
    panelExpanded.update((value) => !value);
  }

  function backToDashboard(): void {
    leaveServer();
  }

  function openLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleThemeToggle(): void {
    toggleTheme();
  }
</script>

<div class="panel-tools-stack">
  <div class="panel-tools-section">
    <div class="info-row">
      <span class="info-label">{$_('status')}</span>
      <span class="info-value">{$isConnected ? $_('connected') : $_('disconnected')}</span>
    </div>
    <p class="hint">{$_('panelToolsHint')}</p>
  </div>

  <div class="panel-tools-section">
    <div class="cmd-label">{$_('panelActions')}</div>
    <div class="panel-tools-grid">
      <button class="mc-btn small" onclick={refreshServerData}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.refresh} size={15} />
          <span>{$_('refreshPanelData')}</span>
        </span>
      </button>
      <button class="mc-btn small" onclick={reconnectRealtime}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.refresh} size={15} />
          <span>{$_('reconnectRealtime')}</span>
        </span>
      </button>
      <button class="mc-btn small" onclick={toggleExpandedPanel}>{$_('togglePanelView')}</button>
      <button class="mc-btn small" onclick={backToDashboard}>{$_('backToPanel')}</button>
      <button class="mc-btn small danger" onclick={clearConsoleLogs}>{$_('clearConsoleLogs')}</button>
      <button class="mc-btn small" onclick={handleThemeToggle}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={$theme === 'dark' ? appIcons.lightMode : appIcons.darkMode} size={15} />
          <span>{$theme === 'dark' ? $_('lightMode') : $_('darkMode')}</span>
        </span>
      </button>
    </div>
  </div>

  <div class="panel-tools-section">
    <div class="cmd-label">{$_('serverActions')}</div>
    <div class="panel-tools-grid">
      <button class="mc-btn small primary" onclick={startServer}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.start} size={15} />
          <span>{$_('start')}</span>
        </span>
      </button>
      <button class="mc-btn small" onclick={restartServer}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.refresh} size={15} />
          <span>{$_('restart')}</span>
        </span>
      </button>
      <button class="mc-btn small warning" onclick={stopServer}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.stop} size={15} />
          <span>{$_('stop')}</span>
        </span>
      </button>
    </div>
  </div>

  <div class="panel-tools-section">
    <div class="cmd-label">{$_('quickCommands')}</div>
    <div class="panel-tools-command">
      <input
        class="mods-search-input"
        bind:value={quickCommand}
        placeholder={$_('enterCommand')}
        onkeydown={(e) => e.key === 'Enter' && sendQuickCommand()}
      />
      <button class="mc-btn small" onclick={sendQuickCommand}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.send} size={15} />
          <span>{$_('send')}</span>
        </span>
      </button>
    </div>
    <div class="panel-tools-preset">
      {#each quickCommands as cmd}
        <button class="mc-btn small" onclick={() => runPresetCommand(cmd)}>{cmd}</button>
      {/each}
    </div>
  </div>

  {#if panelBrand.links.length > 0}
    <div class="panel-tools-section">
      <div class="cmd-label">{$_('quickLinks')}</div>
      <div class="quick-links-grid">
        {#each panelBrand.links as link}
          <button class="mc-btn small" onclick={() => openLink(link.href)} title={$_(link.titleKey)}>
            {$_(link.labelKey)}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
