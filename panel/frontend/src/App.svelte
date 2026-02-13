<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isAuthenticated, checkStatus, isLoading } from '$lib/stores/auth';
  import { loadPanelConfig } from '$lib/stores/config';
  import { theme } from '$lib/stores/theme';
  import { initRouter, isOnDashboard } from '$lib/stores/router';
  import { connectSocket, disconnectSocket } from '$lib/services/socketClient';
  import LeftMenu from '$lib/components/LeftMenu.svelte';
  import LoginScreen from '$lib/components/LoginScreen.svelte';
  import Dashboard from '$lib/components/Dashboard.svelte';
  import Header from '$lib/components/Header.svelte';
  import Console from '$lib/components/Console.svelte';
  import RightPanel from '$lib/components/RightPanel.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';

  onMount(async () => {
    // Load panel config first (for BASE_PATH)
    await loadPanelConfig();
    // Initialize router after config is loaded
    initRouter();
    const authenticated = await checkStatus();
    isLoading.set(false);
    if (authenticated) {
      connectSocket();
    }
  });

  onDestroy(() => {
    disconnectSocket();
  });

  // Connect after login (when user logs in after page load)
  let prevAuth = false;
  isAuthenticated.subscribe(authenticated => {
    if (authenticated && !prevAuth) {
      connectSocket();
    }
    prevAuth = authenticated;
  });

</script>

<svelte:body class:dark-theme={$theme === 'dark'} class:light-theme={$theme === 'light'} />

{#if $isLoading}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
  </div>
{:else if !$isAuthenticated}
  <LoginScreen />
{:else if $isOnDashboard}
  <!-- Dashboard view - no server selected -->
  <Dashboard />
{:else}
  <!-- Server view - managing a specific server -->
  <div class="container panel-workspace-container">
    <Header />
    <div class="panel-workspace">
      <LeftMenu />
      <div class="console-center">
        <Console />
      </div>
      <RightPanel />
    </div>
  </div>
{/if}

<Toast />
