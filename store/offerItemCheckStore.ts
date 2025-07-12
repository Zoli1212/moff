import { create } from 'zustand';
import { OfferItem } from '@/types/offer.types';

interface OfferItemCheckStoreState {
  offerItems: OfferItem[];
  setOfferItems: (items: OfferItem[]) => void;
  clearOfferItems: () => void;
}

export const useOfferItemCheckStore = create<OfferItemCheckStoreState>((set) => ({
  offerItems: [],
  setOfferItems: (items) => set({ offerItems: items }),
  clearOfferItems: () => set({ offerItems: [] }),
}));
