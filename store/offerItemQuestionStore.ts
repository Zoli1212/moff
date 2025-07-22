import { create } from 'zustand';
import { OfferItemQuestion } from '@/types/offer.types';

interface OfferItemQuestionStoreState {
  offerItemsQuestion: OfferItemQuestion[];
  setOfferItemsQuestion: (items: OfferItemQuestion[]) => void;
  clearOfferItemsQuestion: () => void;
}

export const useOfferItemQuestionStore = create<OfferItemQuestionStoreState>((set) => ({
  offerItemsQuestion: [],
  setOfferItemsQuestion: (items) => set({ offerItemsQuestion: items }),
  clearOfferItemsQuestion: () => set({ offerItemsQuestion: [] }),
}));
