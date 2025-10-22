import { create } from 'zustand';

interface RequirementBlockStore {
  blockIds: number[];
  setBlockIds: (ids: number[]) => void;
  clearBlockIds: () => void;
  lastUpdated?: number;
}

export const useRequirementBlockStore = create<RequirementBlockStore>((set) => ({
  blockIds: [],
  lastUpdated: undefined,
  setBlockIds: (ids) => {
    set({ 
      blockIds: ids,
      lastUpdated: Date.now()
    });
  },
  clearBlockIds: () => {
    set({ 
      blockIds: [],
      lastUpdated: Date.now()
    });
  },
}));
