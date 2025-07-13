import { Offer as PrismaOffer } from '@prisma/client';

export interface OfferItem {
  id?: number;
  name: string;
  quantity: string;
  unit: string;
  materialUnitPrice: string;
  unitPrice: string;
  materialTotal: string;
  workTotal: string;
  totalPrice?: string;
  description?: string;
}

export interface OfferWithItems extends Omit<PrismaOffer, 'items' | 'notes'> {
  items: OfferItem[];
  notes: string[];
  requirement: {
    id: number;
    title: string;
    description: string | null;
    status: string;
    updateCount?: number;
    versionNumber?: number;
  } | null;
}

// For backward compatibility
export interface SimpleOfferItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export type { Offer as PrismaOffer } from '@prisma/client';
