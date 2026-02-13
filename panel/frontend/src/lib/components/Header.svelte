<script lang="ts">
  import { appIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { panelBrand } from '$lib/config/branding';
  import { locale } from '$lib/i18n';
  import { logout } from '$lib/stores/auth';
  import { serverStatus } from '$lib/stores/server';
  import { activeServer, activeServerId } from '$lib/stores/servers';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { disconnectSocket, leaveServer } from '$lib/services/socketClient';
  import { formatUptime } from '$lib/utils/formatters';
  import AppIcon from './ui/AppIcon.svelte';
  import StatusBadge from './ui/StatusBadge.svelte';

  let clockTime = $state('--:--:--');
  let uptime = $state('00:00:00');
  function updateClock(): void {
    const now = new Date();
    clockTime = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  }

  function updateUptime(): void {
    uptime = formatUptime($serverStatus.startedAt);
  }

  $effect(() => {
    updateClock();
    updateUptime();

    const clockTimer = setInterval(updateClock, 1000);
    const uptimeTimer = setInterval(updateUptime, 1000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(uptimeTimer);
    };
  });

  function handleLogout(): void {
    disconnectSocket();
    logout();
  }

  function handleBackToPanel(): void {
    leaveServer();
  }

  function handleLangChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    locale.set(target.value);
  }

  function handleThemeToggle(): void {
    toggleTheme();
  }
</script>

<header>
  <div class="logo">
    {#if $activeServerId}
      <button class="back-btn" onclick={handleBackToPanel} title={$_('backToPanel')}>
        <AppIcon name={appIcons.back} size={20} />
      </button>
    {/if}
    <div class="logo-block">{panelBrand.shortMark}</div>
    <div>
      {#if $activeServer}
        <h1>{$activeServer.name}</h1>
        <div class="logo-subtitle">:{$activeServer.port}/UDP</div>
      {:else}
        <h1>{panelBrand.name}</h1>
        <div class="logo-subtitle">{$_(panelBrand.subtitleKey)}</div>
      {/if}
    </div>
  </div>
  <div class="header-right">
    {#each panelBrand.links as link}
      <a href={link.href} target="_blank" rel="noreferrer noopener" class="docs-link" title={$_(link.titleKey)}>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <AppIcon name={appIcons.externalLink} size={15} />
          <span>{$_(link.labelKey)}</span>
        </span>
      </a>
    {/each}
    <button class="theme-toggle-btn" onclick={handleThemeToggle} title={$_('theme')}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={$theme === 'dark' ? appIcons.lightMode : appIcons.darkMode} size={16} />
        <span>{$theme === 'dark' ? $_('lightMode') : $_('darkMode')}</span>
      </span>
    </button>
    <div class="lang-selector">
      <select class="lang-dropdown" value={$locale} onchange={handleLangChange}>
        <option value="en">English</option>
        <option value="es">Espanol</option>
        <option value="uk">Ukrainska</option>
      </select>
    </div>
    <div class="server-clock" title={$_('serverTime')}>
      <span class="clock-label">T</span>
      <span class="clock-time">{clockTime}</span>
    </div>
    <span class="uptime-display">{uptime}</span>
    <StatusBadge running={$serverStatus.running} />
    <button class="logout-btn" onclick={handleLogout}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={appIcons.logout} size={16} />
        <span>{$_('logout')}</span>
      </span>
    </button>
  </div>
</header>
