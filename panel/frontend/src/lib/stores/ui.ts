import type { TabId, Toast, ToastType } from '$lib/types';
import { writable } from 'svelte/store';

export const activeTab = writable<TabId>('control');
export const sidebarHidden = writable<boolean>(false);
export const panelExpanded = writable<boolean>(false);
export const toasts = writable<Toast[]>([]);

let toastId = 0;
let activeToastId: number | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: ToastType = ''): void {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return;

  const id = activeToastId ?? ++toastId;
  activeToastId = id;
  toasts.set([{ id, message: trimmedMessage, type }]);

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    toasts.set([]);
    activeToastId = null;
    toastTimer = null;
  }, 4000);
}
