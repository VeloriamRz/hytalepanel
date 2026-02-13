<script lang="ts">
  import { appIcons, tabIcons } from '$lib/config/icons';
  import { _ } from 'svelte-i18n';
  import { activeTab } from '$lib/stores/ui';
  import type { TabId } from '$lib/types';
  import AppIcon from './ui/AppIcon.svelte';

  let menuOpen = $state(true);

  const tabs: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'config', 'panel'];

  function setTab(tab: TabId): void {
    activeTab.set(tab);
  }

  function toggleMenu(): void {
    menuOpen = !menuOpen;
  }
</script>

<aside class="left-menu">
  <div class="card left-menu-card">
    <button class="menu-toggle-btn" onclick={toggleMenu}>
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <AppIcon name={appIcons.menu} size={16} />
        <span>{$_('menu')}</span>
      </span>
      <span class="menu-toggle-icon">
        <AppIcon name={menuOpen ? appIcons.chevronDown : appIcons.chevronRight} size={16} />
      </span>
    </button>

    {#if menuOpen}
      <div class="menu-options">
        {#each tabs as tab}
          <button class="menu-option-btn" class:active={$activeTab === tab} onclick={() => setTab(tab)}>
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <AppIcon name={tabIcons[tab]} size={16} />
              <span>{$_(tab)}</span>
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</aside>
