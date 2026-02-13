<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { panelBrand } from '$lib/config/branding';
  import { appIcons, tabIcons } from '$lib/config/icons';
  import {
    fetchServers,
    createServer as apiCreateServer,
    updateServer as apiUpdateServer,
    deleteServer as apiDeleteServer,
    startServer,
    stopServer
  } from '$lib/services/api';
  import { joinServerInPanel } from '$lib/services/socketClient';
  import { activeTab, showToast } from '$lib/stores/ui';
  import { activeServerId, servers, serversLoading, type Server } from '$lib/stores/servers';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import type { TabId } from '$lib/types';
  import Console from './Console.svelte';
  import HardwarePanel from './HardwarePanel.svelte';
  import RightPanel from './RightPanel.svelte';
  import ServerCard from './ServerCard.svelte';
  import AppIcon from './ui/AppIcon.svelte';

  type DashboardView = 'overview' | 'configure' | 'consolePanel';
  type ConsolePanelItem = 'console' | TabId;
  type ConfigMode = 'create' | 'configure';

  let bulkActionRunning = $state(false);
  let activeView = $state<DashboardView>('overview');
  let consoleMenuOpen = $state(false);
  let activeConsoleItem = $state<ConsolePanelItem>('console');
  let configMode = $state<ConfigMode>('create');
  let selectedConfigServerId = $state('');
  let loadedConfigServerId = $state('');
  let configSaving = $state(false);
  let createSaving = $state(false);

  const consolePanelTabs: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'config', 'panel'];

  let createName = $state('');
  let createPort = $state(5520);
  let createJavaXms = $state('4G');
  let createJavaXmx = $state('8G');
  let createBindAddr = $state('0.0.0.0');
  let createAutoDownload = $state(true);
  let createUseG1gc = $state(true);
  let createUseMachineId = $state(false);
  let createExtraArgs = $state('');

  let cfgName = $state('');
  let cfgPort = $state(5520);
  let cfgJavaXms = $state('4G');
  let cfgJavaXmx = $state('8G');
  let cfgBindAddr = $state('0.0.0.0');
  let cfgAutoDownload = $state(true);
  let cfgUseG1gc = $state(true);
  let cfgExtraArgs = $state('');
  let cfgUseMachineId = $state(false);

  const runningCount = $derived($servers.filter((server) => server.status === 'running').length);
  const stoppedCount = $derived($servers.filter((server) => server.status !== 'running').length);
  const filteredServers = $derived($servers);
  const selectedConfigServer = $derived($servers.find((server) => server.id === selectedConfigServerId) || null);

  async function loadServers(): Promise<void> {
    serversLoading.set(true);
    const result = await fetchServers();
    serversLoading.set(false);

    if (result.success && result.servers) {
      servers.set(result.servers);
    } else {
      showToast(result.error || 'Failed to load servers', 'error');
    }
  }

  function handleOpenOverview(): void {
    activeView = 'overview';
  }

  function handleToggleConsoleMenu(): void {
    consoleMenuOpen = !consoleMenuOpen;
    if (consoleMenuOpen) {
      handleOpenConsolePanel('console');
    }
  }

  function handleOpenConsolePanel(item: ConsolePanelItem = 'console'): void {
    if ($servers.length === 0) {
      handleOpenConfig('create');
      return;
    }

    const target = $servers.find((server) => server.status === 'running') || $servers[0];
    if ($activeServerId !== target.id) {
      joinServerInPanel(target.id);
    }

    activeView = 'consolePanel';
    activeConsoleItem = item;
    consoleMenuOpen = true;

    if (item !== 'console') {
      activeTab.set(item);
    }
  }

  function getSuggestedPort(): number {
    if ($servers.length === 0) return 5520;
    return Math.max(...$servers.map((server) => server.port)) + 1;
  }

  function setConfigMode(mode: ConfigMode): void {
    configMode = mode;
    if (mode === 'create' && !createName.trim()) {
      createPort = getSuggestedPort();
    }
  }

  function handleOpenConfig(mode: ConfigMode = 'create'): void {
    activeView = 'configure';
    setConfigMode(mode);
  }

  async function handleStartServer(server: Server): Promise<void> {
    const result = await startServer(server.id);
    if (result.success) {
      showToast($_('started'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to start', 'error');
    }
  }

  async function handleStopServer(server: Server): Promise<void> {
    const result = await stopServer(server.id);
    if (result.success) {
      showToast($_('stopped'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to stop', 'error');
    }
  }

  async function handleDeleteServer(server: Server): Promise<void> {
    if (!confirm($_('confirmDeleteServer'))) return;

    const result = await apiDeleteServer(server.id);
    if (result.success) {
      showToast($_('serverDeleted'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  }

  async function handleStartAll(): Promise<void> {
    const targets = $servers.filter((server) => server.status !== 'running');
    if (targets.length === 0) {
      showToast($_('noStoppedServers'));
      return;
    }

    bulkActionRunning = true;
    let successCount = 0;

    for (const server of targets) {
      const result = await startServer(server.id);
      if (result.success) successCount++;
    }

    bulkActionRunning = false;
    await loadServers();
    showToast($_('bulkActionDone', { values: { count: successCount, total: targets.length } }));
  }

  async function handleStopAll(): Promise<void> {
    const targets = $servers.filter((server) => server.status === 'running');
    if (targets.length === 0) {
      showToast($_('noRunningServers'));
      return;
    }

    if (!confirm($_('confirmStopAllServers'))) return;

    bulkActionRunning = true;
    let successCount = 0;

    for (const server of targets) {
      const result = await stopServer(server.id);
      if (result.success) successCount++;
    }

    bulkActionRunning = false;
    await loadServers();
    showToast($_('bulkActionDone', { values: { count: successCount, total: targets.length } }));
  }

  function handleThemeToggle(): void {
    toggleTheme();
  }

  async function handleSaveConfig(): Promise<void> {
    if (!selectedConfigServer) return;

    const parsedPort = Number(cfgPort);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      showToast($_('invalidPort'), 'error');
      return;
    }

    configSaving = true;

    const result = await apiUpdateServer(selectedConfigServer.id, {
      name: cfgName.trim() || selectedConfigServer.name,
      port: parsedPort,
      config: {
        javaXms: cfgJavaXms.trim(),
        javaXmx: cfgJavaXmx.trim(),
        bindAddr: cfgBindAddr.trim(),
        autoDownload: cfgAutoDownload,
        useG1gc: cfgUseG1gc,
        extraArgs: cfgExtraArgs,
        useMachineId: cfgUseMachineId
      }
    });

    configSaving = false;

    if (result.success) {
      showToast($_('configSaved'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to save config', 'error');
    }
  }

  async function handleCreateServerFromSetup(): Promise<void> {
    if (!createName.trim()) {
      showToast($_('serverNameRequired'), 'error');
      return;
    }

    const parsedPort = Number(createPort);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      showToast($_('invalidPort'), 'error');
      return;
    }

    createSaving = true;

    const result = await apiCreateServer({
      name: createName.trim(),
      port: parsedPort,
      config: {
        javaXms: createJavaXms.trim(),
        javaXmx: createJavaXmx.trim(),
        bindAddr: createBindAddr.trim() || '0.0.0.0',
        autoDownload: createAutoDownload,
        useG1gc: createUseG1gc,
        extraArgs: createExtraArgs,
        useMachineId: createUseMachineId
      }
    });

    createSaving = false;

    if (result.success) {
      showToast($_('serverCreated'));
      await loadServers();
      if (result.server) {
        selectedConfigServerId = result.server.id;
        loadedConfigServerId = '';
        joinServerInPanel(result.server.id);
        activeView = 'consolePanel';
        activeConsoleItem = 'console';
        consoleMenuOpen = true;
        return;
      }
      handleOpenConsolePanel('console');
    } else {
      showToast(result.error || 'Failed to create server', 'error');
    }
  }

  $effect(() => {
    if ($servers.length === 0) {
      selectedConfigServerId = '';
      loadedConfigServerId = '';
      return;
    }

    if (!selectedConfigServerId || !$servers.some((server) => server.id === selectedConfigServerId)) {
      selectedConfigServerId = $servers[0].id;
    }
  });

  $effect(() => {
    if (!selectedConfigServer) return;
    if (loadedConfigServerId === selectedConfigServer.id) return;

    loadedConfigServerId = selectedConfigServer.id;
    cfgName = selectedConfigServer.name;
    cfgPort = selectedConfigServer.port;
    cfgJavaXms = selectedConfigServer.config.javaXms;
    cfgJavaXmx = selectedConfigServer.config.javaXmx;
    cfgBindAddr = selectedConfigServer.config.bindAddr;
    cfgAutoDownload = selectedConfigServer.config.autoDownload;
    cfgUseG1gc = selectedConfigServer.config.useG1gc;
    cfgExtraArgs = selectedConfigServer.config.extraArgs;
    cfgUseMachineId = selectedConfigServer.config.useMachineId;
  });

  $effect(() => {
    loadServers();
  });
</script>

<div class="dashboard vault-dashboard">
  <aside class="vault-sidebar">
    <div class="vault-brand">
      <img src="/images/logo.png" alt={panelBrand.name} class="logo-img" />
      <div class="vault-brand-text">
        <h1>{panelBrand.name}</h1>
        <span>{$_(panelBrand.subtitleKey)}</span>
      </div>
    </div>

    <div class="vault-menu-label">{$_('mainMenu')}</div>
    <div class="vault-menu-list">
      <button class="vault-menu-item" class:active={activeView === 'overview'} onclick={handleOpenOverview}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.dashboard} size={17} />
          <span>{$_('dashboard')}</span>
        </span>
      </button>
      <button
        class="vault-menu-item vault-menu-expand"
        class:active={activeView === 'consolePanel'}
        onclick={handleToggleConsoleMenu}
      >
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.consolePanel} size={17} />
          <span>{$_('consolePanel')}</span>
        </span>
        <span class="vault-menu-caret" class:open={consoleMenuOpen}>
          <AppIcon name={consoleMenuOpen ? appIcons.chevronDown : appIcons.chevronRight} size={16} />
        </span>
      </button>

      {#if consoleMenuOpen}
        <div class="vault-submenu-list">
          <button
            class="vault-menu-item vault-submenu-item"
            class:active={activeView === 'consolePanel' && activeConsoleItem === 'console'}
            onclick={() => handleOpenConsolePanel('console')}
          >
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <AppIcon name={appIcons.console} size={16} />
              <span>{$_('console')}</span>
            </span>
          </button>

          {#each consolePanelTabs as tab}
            <button
              class="vault-menu-item vault-submenu-item"
              class:active={activeView === 'consolePanel' && activeConsoleItem === tab}
              onclick={() => handleOpenConsolePanel(tab)}
            >
              <span style="display: inline-flex; align-items: center; gap: 8px;">
                <AppIcon name={tabIcons[tab]} size={16} />
                <span>{$_(tab)}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="vault-sidebar-bottom">
      <button class="vault-side-btn" onclick={handleThemeToggle}>
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={$theme === 'dark' ? appIcons.lightMode : appIcons.darkMode} size={17} />
          <span>{$theme === 'dark' ? $_('lightMode') : $_('darkMode')}</span>
        </span>
      </button>
      <button class="vault-side-btn danger">
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <AppIcon name={appIcons.logout} size={17} />
          <span>{$_('logout')}</span>
        </span>
      </button>
    </div>
  </aside>

  <div class="vault-main">
    <div class="vault-topbar">
      <div class="vault-title-wrap">
        {#if activeView === 'overview'}
          <h2>{$_('dashboard')}</h2>
          <p>{$_('dashboardSubtitle')}</p>
        {:else if activeView === 'configure'}
          <h2>{$_('serverSetupTitle')}</h2>
          <p>{$_('serverSetupSubtitle')}</p>
        {:else}
          <h2>{$_('consolePanel')}</h2>
          <p>{$_('consolePanelSubtitle')}</p>
        {/if}
      </div>
    </div>

    <div class="vault-layout">
      <section class="vault-center">
        {#if activeView === 'overview'}
          <div class="vault-overview-row">
            <div class="vault-summary-row">
              <div class="vault-rail-card accent">
                <span class="vault-rail-title">{$_('totalServers')}</span>
                <span class="vault-rail-value">{$servers.length}</span>
                <span class="vault-rail-meta">{$_('dashboard')}</span>
              </div>
              <div class="vault-rail-card">
                <span class="vault-rail-title">{$_('runningServers')}</span>
                <span class="vault-rail-value">{runningCount}</span>
                <span class="vault-rail-meta">{$_('online')}</span>
              </div>
              <div class="vault-rail-card">
                <span class="vault-rail-title">{$_('stoppedServers')}</span>
                <span class="vault-rail-value">{stoppedCount}</span>
                <span class="vault-rail-meta">{$_('offline')}</span>
              </div>
            </div>

            <div class="vault-action-card">
              <button class="mc-btn small" onclick={loadServers} disabled={$serversLoading || bulkActionRunning}>
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.refresh} size={16} />
                  <span>{$_('refreshList')}</span>
                </span>
              </button>
              <button
                class="mc-btn small"
                onclick={handleStartAll}
                disabled={bulkActionRunning || stoppedCount === 0}
              >
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.start} size={16} />
                  <span>{$_('startAllServers')}</span>
                </span>
              </button>
              <button
                class="mc-btn small"
                onclick={handleStopAll}
                disabled={bulkActionRunning || runningCount === 0}
              >
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.stop} size={16} />
                  <span>{$_('stopAllServers')}</span>
                </span>
              </button>
              <button class="mc-btn small" onclick={() => handleOpenConfig('create')}>
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.create} size={16} />
                  <span>{$_('createServer')}</span>
                </span>
              </button>
            </div>
          </div>

          <div class="dashboard-content">
            {#if $serversLoading}
              <div class="dashboard-empty">
                <div class="loading-spinner"></div>
                <p>{$_('loading')}</p>
              </div>
            {:else if $servers.length === 0}
              <div class="dashboard-empty">
                <img src="/images/hytale.png" alt="Hytale" class="empty-icon" />
                <h2>{$_('noServers')}</h2>
                <p>{$_('createServerHint')}</p>
                <button class="mc-btn" onclick={() => handleOpenConfig('create')}>
                  <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <AppIcon name={appIcons.create} size={17} />
                    <span>{$_('createServer')}</span>
                  </span>
                </button>
              </div>
            {:else}
              <div class="servers-grid vault-server-grid">
                {#each filteredServers as server (server.id)}
                  <ServerCard
                    {server}
                    onStart={() => handleStartServer(server)}
                    onStop={() => handleStopServer(server)}
                    onDelete={() => handleDeleteServer(server)}
                  />
                {/each}
              </div>
            {/if}

            <HardwarePanel enabled={runningCount > 0} />
          </div>
        {:else if activeView === 'configure'}
          <div class="vault-config-center">
            <div class="vault-config-header-card">
              <h2>{$_('configure')}</h2>
              <p>{$_('serverSetupSubtitle')}</p>
            </div>

            <div class="vault-config-mode-switch">
              <button
                class="vault-config-mode-btn"
                class:active={configMode === 'create'}
                onclick={() => setConfigMode('create')}
              >
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.create} size={16} />
                  <span>{$_('createServer')}</span>
                </span>
              </button>
              <button
                class="vault-config-mode-btn"
                class:active={configMode === 'configure'}
                onclick={() => setConfigMode('configure')}
              >
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <AppIcon name={appIcons.configure} size={16} />
                  <span>{$_('configureServerOption')}</span>
                </span>
              </button>
            </div>

            {#if configMode === 'create'}
              <div class="vault-config-card">
                <div class="vault-config-top">
                  <p class="vault-config-mode-hint">{$_('createModeHint')}</p>
                </div>

                <div class="vault-config-grid">
                  <div class="form-group">
                    <label for="create-name">{$_('serverName')}</label>
                    <input id="create-name" class="form-input" bind:value={createName} />
                  </div>
                  <div class="form-group">
                    <label for="create-port">{$_('serverPort')}</label>
                    <input
                      id="create-port"
                      class="form-input"
                      type="number"
                      min="1"
                      max="65535"
                      bind:value={createPort}
                    />
                  </div>
                  <div class="form-group">
                    <label for="create-xms">{$_('minMemory')}</label>
                    <input id="create-xms" class="form-input" bind:value={createJavaXms} />
                  </div>
                  <div class="form-group">
                    <label for="create-xmx">{$_('maxMemory')}</label>
                    <input id="create-xmx" class="form-input" bind:value={createJavaXmx} />
                  </div>
                  <div class="form-group full">
                    <label for="create-bind">{$_('bindAddress')}</label>
                    <input id="create-bind" class="form-input" bind:value={createBindAddr} />
                  </div>
                  <label class="vault-config-check">
                    <input type="checkbox" bind:checked={createUseG1gc} />
                    <span>{$_('useG1GC')}</span>
                  </label>
                  <label class="vault-config-check">
                    <input type="checkbox" bind:checked={createUseMachineId} />
                    <span>{$_('linuxNative')}</span>
                  </label>
                  <label class="vault-config-check full">
                    <input type="checkbox" bind:checked={createAutoDownload} />
                    <span>{$_('autoDownloadFiles')}</span>
                  </label>
                  <div class="form-group full">
                    <label for="create-args">{$_('extraArgs')}</label>
                    <textarea id="create-args" class="form-input" rows="3" bind:value={createExtraArgs}></textarea>
                  </div>
                </div>

                <div class="vault-config-actions">
                  <button class="mc-btn" onclick={handleCreateServerFromSetup} disabled={createSaving}>
                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                      <AppIcon name={appIcons.create} size={16} />
                      <span>{createSaving ? $_('creating') : $_('create')}</span>
                    </span>
                  </button>
                </div>
              </div>
            {:else}
              {#if !$servers.length}
                <div class="dashboard-empty vault-config-empty">
                  <h2>{$_('noServers')}</h2>
                  <p>{$_('createServerHint')}</p>
                </div>
              {:else}
                <div class="vault-config-card">
                  <div class="vault-config-top">
                    <p class="vault-config-mode-hint">{$_('configureModeHint')}</p>
                    <div class="vault-config-select">
                      <label for="server-config-select">{$_('serverToConfigure')}</label>
                      <select
                        id="server-config-select"
                        class="form-select"
                        bind:value={selectedConfigServerId}
                        onchange={() => (loadedConfigServerId = '')}
                      >
                        {#each $servers as server (server.id)}
                          <option value={server.id}>{server.name}</option>
                        {/each}
                      </select>
                    </div>
                  </div>

                  <div class="vault-config-grid">
                    <div class="form-group">
                      <label for="cfg-name">{$_('serverName')}</label>
                      <input id="cfg-name" class="form-input" bind:value={cfgName} />
                    </div>
                    <div class="form-group">
                      <label for="cfg-port">{$_('serverPort')}</label>
                      <input id="cfg-port" class="form-input" type="number" min="1" max="65535" bind:value={cfgPort} />
                    </div>
                    <div class="form-group">
                      <label for="cfg-xms">{$_('minMemory')}</label>
                      <input id="cfg-xms" class="form-input" bind:value={cfgJavaXms} />
                    </div>
                    <div class="form-group">
                      <label for="cfg-xmx">{$_('maxMemory')}</label>
                      <input id="cfg-xmx" class="form-input" bind:value={cfgJavaXmx} />
                    </div>
                    <div class="form-group full">
                      <label for="cfg-bind">{$_('bindAddress')}</label>
                      <input id="cfg-bind" class="form-input" bind:value={cfgBindAddr} />
                    </div>
                    <label class="vault-config-check">
                      <input type="checkbox" bind:checked={cfgUseG1gc} />
                      <span>{$_('useG1GC')}</span>
                    </label>
                    <label class="vault-config-check">
                      <input type="checkbox" bind:checked={cfgUseMachineId} />
                      <span>{$_('linuxNative')}</span>
                    </label>
                    <label class="vault-config-check full">
                      <input type="checkbox" bind:checked={cfgAutoDownload} />
                      <span>{$_('autoDownloadFiles')}</span>
                    </label>
                    <div class="form-group full">
                      <label for="cfg-args">{$_('extraArgs')}</label>
                      <textarea id="cfg-args" class="form-input" rows="3" bind:value={cfgExtraArgs}></textarea>
                    </div>
                  </div>

                  <div class="vault-config-actions">
                    <button class="mc-btn" onclick={handleSaveConfig} disabled={configSaving}>
                      <span style="display: inline-flex; align-items: center; gap: 8px;">
                        <AppIcon name={appIcons.save} size={16} />
                        <span>{configSaving ? $_('saving') : $_('saveConfigChanges')}</span>
                      </span>
                    </button>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="vault-console-layout" class:with-right={activeConsoleItem !== 'console'}>
            <section class="vault-console-center">
              <Console />
            </section>

            {#if activeConsoleItem !== 'console'}
              <RightPanel />
            {/if}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>
