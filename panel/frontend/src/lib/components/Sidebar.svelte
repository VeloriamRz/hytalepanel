<script lang="ts">
  import { appIcons, tabIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { activeTab, sidebarHidden, panelExpanded } from '$lib/stores/ui';
  import type { TabId } from '$lib/types';
  import BackupsTab from './tabs/BackupsTab.svelte';
  import ConfigTab from './tabs/ConfigTab.svelte';
  import ControlTab from './tabs/ControlTab.svelte';
  import FilesTab from './tabs/FilesTab.svelte';
  import ModsTab from './tabs/ModsTab.svelte';
  import PanelToolsTab from './tabs/PanelToolsTab.svelte';
  import SetupTab from './tabs/SetupTab.svelte';
  import AppIcon from './ui/AppIcon.svelte';

  const tabs: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'config', 'panel'];

  function setTab(tab: TabId): void {
    activeTab.set(tab);
  }

  function toggleExpand(): void {
    panelExpanded.update((v) => !v);
  }

  function hideSidebar(): void {
    sidebarHidden.set(true);
  }
</script>

<div class="sidebar">
  <div class="card">
    <div class="tabs-header">
      {#each tabs as tab}
        <button class="tab-btn" class:active={$activeTab === tab} onclick={() => setTab(tab)}>
          <span style="display: inline-flex; align-items: center; gap: 8px;">
            <AppIcon name={tabIcons[tab]} size={15} />
            <span>{$_(tab)}</span>
          </span>
        </button>
      {/each}
    </div>

    <div id="tab-setup" class="tab-content" class:active={$activeTab === 'setup'}>
      <SetupTab />
    </div>

    <div id="tab-files" class="tab-content" class:active={$activeTab === 'files'}>
      <FilesTab />
    </div>

    <div id="tab-mods" class="tab-content" class:active={$activeTab === 'mods'}>
      <ModsTab />
    </div>

    <div id="tab-control" class="tab-content" class:active={$activeTab === 'control'}>
      <ControlTab />
    </div>

    <div id="tab-config" class="tab-content" class:active={$activeTab === 'config'}>
      <ConfigTab />
    </div>

    <div id="tab-backups" class="tab-content" class:active={$activeTab === 'backups'}>
      <BackupsTab />
    </div>

    <div id="tab-panel" class="tab-content" class:active={$activeTab === 'panel'}>
      <PanelToolsTab />
    </div>

    <div class="sidebar-toolbar">
      <button id="btn-expand-panel" class="sidebar-btn" title="Expand" onclick={toggleExpand}>
        <AppIcon name={$panelExpanded ? appIcons.chevronRight : appIcons.menu} size={16} />
      </button>
      <button id="btn-hide-sidebar" class="sidebar-btn" title="Hide" onclick={hideSidebar}>
        <AppIcon name={appIcons.error} size={16} />
      </button>
    </div>
  </div>
</div>
