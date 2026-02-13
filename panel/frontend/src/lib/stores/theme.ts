import { writable } from 'svelte/store';

const browser = typeof window !== 'undefined';
const STORAGE_KEY = 'hytale-panel-theme';
const LEGACY_KEY = 'hybora-theme';

function getInitialTheme(): 'dark' | 'light' {
  if (!browser) return 'dark';

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable<'dark' | 'light'>(getInitialTheme());

theme.subscribe((value) => {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, value);
});

export function toggleTheme(): void {
  theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
}
