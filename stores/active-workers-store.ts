import { create } from "zustand";
import type { WorkItemWorker } from "@/types/work";

interface ActiveWorkersState {
  activeWorkers: WorkItemWorker[];
  workerHours: Map<string, number>;
  setActiveWorkers: (workers: WorkItemWorker[]) => void;
  setWorkerHours: (hours: Map<string, number>) => void;
  clearActiveWorkers: () => void;
}

export const useActiveWorkersStore = create<ActiveWorkersState>((set) => ({
  activeWorkers: [],
  workerHours: new Map(),
  setActiveWorkers: (workers) => set({ activeWorkers: workers }),
  setWorkerHours: (hours) => set({ workerHours: hours }),
  clearActiveWorkers: () => set({ activeWorkers: [], workerHours: new Map() }),
}));
