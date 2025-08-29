import { create } from 'zustand';

interface WorkerSlotsState {
  slots: Record<string, number>;
  setSlots: (slots: Record<string, number>) => void;
  addSlot: (role: string) => void;
  removeSlot: (role: string) => void;
}

export const useWorkerSlotsStore = create<WorkerSlotsState>((set) => ({
  slots: {},
  setSlots: (slots) => set({ slots }),
  addSlot: (role) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [role]: (state.slots[role] || 0) + 1,
      },
    })),
  removeSlot: (role) =>
    set((state) => {
      const currentSlots = state.slots[role] || 0;
      if (currentSlots <= 1) {
        // Prevents reducing below 1, adjust if needed
        const { [role]: _, ...rest } = state.slots;
        return { slots: rest };
      } else {
        return {
          slots: {
            ...state.slots,
            [role]: currentSlots - 1,
          },
        };
      }
    }),
}));
