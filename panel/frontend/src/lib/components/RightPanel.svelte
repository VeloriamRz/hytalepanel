<script lang="ts">
  import { tabIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { activeTab } from '$lib/stores/ui';
  import AppIcon from './ui/AppIcon.svelte';
  import BackupsTab from './tabs/BackupsTab.svelte';
  import ConfigTab from './tabs/ConfigTab.svelte';
  import ControlTab from './tabs/ControlTab.svelte';
  import FilesTab from './tabs/FilesTab.svelte';
  import ModsTab from './tabs/ModsTab.svelte';
  import PanelToolsTab from './tabs/PanelToolsTab.svelte';
  import SetupTab from './tabs/SetupTab.svelte';
</script>

<aside class="right-panel">
  <div class="card right-panel-card">
    <div class="card-header">
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={tabIcons[$activeTab]} size={17} />
        <span>{$_($activeTab)}</span>
      </span>
    </div>

    <div id="tab-control" class="tab-content right-tab-content" class:active={$activeTab === 'control'}>
      <ControlTab />
    </div>

    <div id="tab-setup" class="tab-content right-tab-content" class:active={$activeTab === 'setup'}>
      <SetupTab />
    </div>

    <div id="tab-files" class="tab-content right-tab-content" class:active={$activeTab === 'files'}>
      <FilesTab />
    </div>

    <div id="tab-mods" class="tab-content right-tab-content" class:active={$activeTab === 'mods'}>
      <ModsTab />
    </div>

    <div id="tab-backups" class="tab-content right-tab-content" class:active={$activeTab === 'backups'}>
      <BackupsTab />
    </div>

    <div id="tab-config" class="tab-content right-tab-content" class:active={$activeTab === 'config'}>
      <ConfigTab />
    </div>

    <div id="tab-panel" class="tab-content right-tab-content" class:active={$activeTab === 'panel'}>
      <PanelToolsTab />
    </div>
  </div>
</aside>
