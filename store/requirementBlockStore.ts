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
    console.log('[RequirementBlockStore] Setting block IDs:', ids);
    set({ 
      blockIds: ids,
      lastUpdated: Date.now()
    });
  },
  clearBlockIds: () => {
    console.log('[RequirementBlockStore] Clearing block IDs');
    set({ 
      blockIds: [],
      lastUpdated: Date.now()
    });
  },
}));
