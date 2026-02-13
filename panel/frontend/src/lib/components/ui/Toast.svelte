<script lang="ts">
  import { appIcons } from '$lib/config/icons';
  import { toasts } from '$lib/stores/ui';
  import type { ToastType } from '$lib/types';
  import AppIcon from './AppIcon.svelte';

  function getToastIcon(type: ToastType): string {
    if (type === 'error') return appIcons.error;
    if (type === 'success') return appIcons.success;
    return appIcons.info;
  }
</script>

<div class="toast-stack" role="status" aria-live="polite">
  {#each $toasts.slice(-1) as toast (toast.id)}
    <div class={`toast toast--${toast.type || 'info'}`}>
      <span class="toast-icon"><AppIcon name={getToastIcon(toast.type)} size={16} /></span>
      <span class="toast-message">{toast.message}</span>
    </div>
  {/each}
</div>
