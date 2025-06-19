import { create } from "zustand";

interface OfferLetterStore {
  // Az ajánlatkérés szövege
  offerText: string;
  // A szöveg beállítása
  setOfferText: (text: string) => void;
  // A szöveg törlése
  clearOfferText: () => void;
}

export const useOfferLetterStore = create<OfferLetterStore>((set) => ({
  // Kezdetben üres a szöveg
  offerText: "",

  // A szöveg frissítése
  setOfferText: (text: string) => set({ offerText: text }),

  // A szöveg törlése
  clearOfferText: () => set({ offerText: "" }),
}));
