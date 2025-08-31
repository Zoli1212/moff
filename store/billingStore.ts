import { create } from 'zustand';

// This interface should ideally be in a shared types file
interface OfferItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number; // Munkadíj egységár
  materialUnitPrice?: number; // Anyag egységár
  workTotal?: number; // Munkadíj összesen
  materialTotal?: number; // Anyagköltség összesen
  totalPrice: number; // Teljes ár
  description?: string;
}

interface BillingState {
  selectedItems: OfferItem[];
  toggleItem: (item: OfferItem) => void;
  isItemSelected: (itemId: number) => boolean;
  clearSelectedItems: () => void;
  totalSelectedPrice: () => number;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  selectedItems: [],

  toggleItem: (item: OfferItem) => {
    const items = get().selectedItems;
    const itemId = item.id ?? -1;
    if (items.some((i: OfferItem) => i.id === itemId)) {
      set({ selectedItems: items.filter((i: OfferItem) => i.id !== itemId) });
    } else {
      set({ selectedItems: [...items, item] });
    }
  },

  isItemSelected: (itemId: number) => {
    return get().selectedItems.some((item: OfferItem) => item.id === itemId);
  },

  clearSelectedItems: () => {
    set({ selectedItems: [] });
  },

  totalSelectedPrice: (): number => {
    return get().selectedItems.reduce((total: number, item: OfferItem) => total + item.totalPrice, 0);
  },
}));
