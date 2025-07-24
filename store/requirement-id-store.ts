import { create } from 'zustand';

interface RequirementIdStore {
  requirementId: number | null;
  setRequirementId: (id: number) => void;
  clearRequirementId: () => void;
}

export const useRequirementIdStore = create<RequirementIdStore>((set) => ({
  requirementId: null,
  setRequirementId: (id: number) => set({ requirementId: id }),
  clearRequirementId: () => set({ requirementId: null }),
}));
