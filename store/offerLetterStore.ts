import { create } from "zustand";

interface DemandStore {
  // Az ajánlatkérés szövege
  demandText: string;
  // A szöveg beállítása
  setDemandText: (text: string) => void;
  // A szöveg törlése
  clearDemandText: () => void;
}

export const useDemandStore = create<DemandStore>((set) => ({
  // Kezdetben üres a szöveg
  demandText: "",

  // A szöveg frissítése
  setDemandText: (text: string) => set({ demandText: text }),

  // A szöveg törlése
  clearDemandText: () => set({ demandText: "" }),
}));
