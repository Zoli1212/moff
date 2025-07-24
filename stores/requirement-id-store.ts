import { create } from 'zustand';

interface RequirementIdStore {
  requirementId: string | null;
  setRequirementId: (id: string) => void;
  clearRequirementId: () => void;
}

export const useRequirementIdStore = create<RequirementIdStore>((set) => ({
  requirementId: null,
  setRequirementId: (id: string) => set({ requirementId: id }),
  clearRequirementId: () => set({ requirementId: null }),
}));
