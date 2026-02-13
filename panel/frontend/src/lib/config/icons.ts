import type { TabId } from '$lib/types';

export const appIcons = {
  dashboard: 'mdi:view-dashboard-outline',
  consolePanel: 'mdi:console-line',
  console: 'mdi:console',
  menu: 'mdi:menu',
  chevronDown: 'mdi:chevron-down',
  chevronRight: 'mdi:chevron-right',
  refresh: 'mdi:refresh',
  start: 'mdi:play',
  stop: 'mdi:stop',
  create: 'mdi:plus-circle-outline',
  configure: 'mdi:cog-outline',
  save: 'mdi:content-save-outline',
  lightMode: 'mdi:white-balance-sunny',
  darkMode: 'mdi:weather-night',
  logout: 'mdi:logout',
  back: 'mdi:arrow-left',
  externalLink: 'mdi:open-in-new',
  delete: 'mdi:trash-can-outline',
  success: 'mdi:check-circle-outline',
  error: 'mdi:close-circle-outline',
  info: 'mdi:information-outline',
  send: 'mdi:send-outline'
} as const;

export const tabIcons: Record<TabId, string> = {
  control: 'mdi:gamepad-variant-outline',
  setup: 'mdi:cog-outline',
  files: 'mdi:folder-outline',
  mods: 'mdi:puzzle-outline',
  backups: 'mdi:backup-restore',
  config: 'mdi:tune-variant',
  panel: 'mdi:tools'
};
