import { create } from "zustand";

interface TableItem {
  name: string;
  quantity: string;
  unit: string;
  materialUnitPrice: string;
  workUnitPrice: string;
  materialTotal: string;
  workTotal: string;
}

interface DemandStore {
  demandText: string;
  setDemandText: (text: string) => void;
  clearDemandText: () => void;

  storedItems: TableItem[];
  setStoredItems: (items: TableItem[]) => void;
  clearStoredItems: () => void;

  // Extra requirement text for delayed block saving
  extraRequirementText: string;
  setExtraRequirementText: (text: string) => void;
  clearExtraRequirementText: () => void;

  // Global loading state
  isGlobalLoading: boolean;
  setGlobalLoading: (isLoading: boolean) => void;
}

export const useDemandStore = create<DemandStore>((set) => ({
  demandText: "",
  setDemandText: (text) => set({ demandText: text }),
  clearDemandText: () => set({ demandText: "" }),

  storedItems: [],
  setStoredItems: (items) => set({ storedItems: items }),
  clearStoredItems: () => set({ storedItems: [] }),

  // Extra requirement text for delayed block saving
  extraRequirementText: "",
  setExtraRequirementText: (text) => set({ extraRequirementText: text }),
  clearExtraRequirementText: () => set({ extraRequirementText: "" }),

  // Global loading state
  isGlobalLoading: false,
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}));
