"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { getOfferById } from "@/actions/offer-actions";
import { createBilling } from "@/actions/billing-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { BillingItems } from "./_components/BillingItems";
import { OfferItem } from "@/types/offer.types";

interface Offer {
  id: number;
  title: string;
  status: string;
  items?: OfferItem[];
  totalPrice?: number;
  description?: string | null;
}

export default function BillingsDetailPage() {
  const params = useParams();
  const offerId = params.offerId as string;
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [billingItems, setBillingItems] = useState<OfferItem[]>([]);

  const hasSelectedItems = useMemo(() => {
    return billingItems.some((item) => item.isSelected);
  }, [billingItems]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        if (!offerId) return;
        const data = await getOfferById(Number(offerId));
        if (data) {
          const itemsWithIds =
            data.items?.map((item: OfferItem, index: number) => ({
              ...item,
              id: item.id ?? index,
            })) ?? [];
          setOffer({ ...data, items: itemsWithIds });
        } else {
          setError("Ajánlat nem található.");
        }
      } catch (err) {
        setError("Hiba történt az ajánlat betöltésekor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  useEffect(() => {
    if (offer) {
      setBillingItems(
        (offer.items || []).map((item) => ({ ...item, isSelected: false }))
      );
    }
  }, [offer]);

  // Refresh offer data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      if (offer) {
        // Refetch offer data to get updated billedQuantity values
        const fetchUpdatedOffer = async () => {
          try {
            const data = await getOfferById(Number(offerId));
            if (data) {
              const itemsWithIds =
                data.items?.map((item: OfferItem, index: number) => ({
                  ...item,
                  id: item.id ?? index,
                })) ?? [];
              setOffer({ ...data, items: itemsWithIds });
            }
          } catch (err) {
            console.error('Error refreshing offer:', err);
          }
        };
        fetchUpdatedOffer();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [offerId, offer]);

  const handleCreateBilling = async () => {
    if (!offer || billingItems.length === 0) return;

    const parseCurrency = (value: string | undefined): number => {
      if (!value) return 0;
      const numericValue = String(value)
        .replace(/[^0-9,-]+/g, "")
        .replace(",", ".");
      return parseFloat(numericValue) || 0;
    };

    const itemsForBilling = billingItems
      .filter((item) => item.isSelected)
      .map((item) => {
        const materialTotal = parseCurrency(item.materialTotal);
        const workTotal = parseCurrency(item.workTotal);
        return {
          ...item,
          quantity: parseFloat(String(item.quantity).replace(",", ".")) || 0,
          unitPrice: parseCurrency(item.unitPrice),
          materialUnitPrice: parseCurrency(item.materialUnitPrice),
          workTotal: workTotal,
          materialTotal: materialTotal,
          totalPrice: materialTotal + workTotal,
        };
      });

    try {
      const result = await createBilling({
        title: offer.title,
        offerId: offer.id,
        items: itemsForBilling,
      });
      if (result.success) {
        router.push(`/billings/drafts/${result.billingId}`);
      } else {
        console.error("Failed to create billing:", result.error);
        // Optionally, show an error message to the user
      }
    } catch (error) {
      console.error("Error during billing creation:", error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4 pb-24">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/billings" className="p-2">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 truncate">
            {offer?.title || "Számla létrehozása"}
          </h1>
          <div className="w-8"></div>
        </div>

        {loading && <p>Betöltés...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {offer && (
          <BillingItems items={billingItems} onItemsChange={setBillingItems} />
        )}

        {hasSelectedItems && (
          <>
            {/* Desktop view - bottom fixed bar */}
            <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg-top">
              <div className="max-w-7xl mx-auto flex justify-end">
                <Button onClick={handleCreateBilling} size="lg">
                  Számla létrehozása
                </Button>
              </div>
            </div>
            
            {/* Mobile view - floating bottom center button */}
            <div className="sm:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
              <Button 
                onClick={handleCreateBilling} 
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg px-8 py-4 text-lg font-semibold rounded-full"
              >
                Számla létrehozása
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
