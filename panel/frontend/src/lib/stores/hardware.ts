import type { SystemMetrics } from '$lib/types';
import { writable } from 'svelte/store';

const MAX_POINTS = 60;

export interface HardwareHistory {
  cpu: number[];
  memory: number[];
  disk: number[];
  processCpu: number[];
  processMemory: number[];
}

export interface HardwareState {
  current: SystemMetrics | null;
  history: HardwareHistory;
}

const initialHistory: HardwareHistory = {
  cpu: [],
  memory: [],
  disk: [],
  processCpu: [],
  processMemory: []
};

export const hardware = writable<HardwareState>({
  current: null,
  history: initialHistory
});

function pushValue(list: number[], value: number): number[] {
  const next = [...list, value];
  if (next.length > MAX_POINTS) {
    next.shift();
  }
  return next;
}

export function pushHardwareMetrics(metrics: SystemMetrics): void {
  hardware.update((state) => ({
    current: metrics,
    history: {
      cpu: pushValue(state.history.cpu, metrics.cpuPercent),
      memory: pushValue(state.history.memory, metrics.memoryPercent),
      disk: pushValue(state.history.disk, metrics.diskPercent ?? 0),
      processCpu: pushValue(state.history.processCpu, metrics.processCpuPercent),
      processMemory: pushValue(state.history.processMemory, metrics.processRssMb)
    }
  }));
}

export function resetHardwareMetrics(): void {
  hardware.set({
    current: null,
    history: {
      cpu: [],
      memory: [],
      disk: [],
      processCpu: [],
      processMemory: []
    }
  });
}
