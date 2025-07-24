import { create } from 'zustand';

interface OfferTitleStore {
  offerTitle: string | null;
  setOfferTitle: (title: string) => void;
  clearOfferTitle: () => void;
}

export const useOfferTitleStore = create<OfferTitleStore>((set) => ({
  offerTitle: null,
  setOfferTitle: (title: string) => set({ offerTitle: title }),
  clearOfferTitle: () => set({ offerTitle: null }),
}));
