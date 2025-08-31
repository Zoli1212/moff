"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getOfferById } from "@/actions/offer-actions";
import { createBilling } from "@/actions/billing-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { useBillingStore } from "@/store/billingStore";
import { Checkbox } from "@/components/ui/checkbox";

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

  const {
    selectedItems,
    toggleItem,
    isItemSelected,
    clearSelectedItems,
    totalSelectedPrice,
  } = useBillingStore();

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

    // Clear selected items on component unmount or offer change
    return () => {
      clearSelectedItems();
    };
  }, [offerId, clearSelectedItems]);

  const currentTotal = totalSelectedPrice();

  const handleCreateBilling = async () => {
    if (!offer || selectedItems.length === 0) return;

    try {
      const result = await createBilling({
        title: offer.title,
        offerId: offer.id,
        items: selectedItems,
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
          <div className="space-y-3">
            {offer.items?.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm p-4 transition-all flex justify-between items-start ${isItemSelected(item.id!) ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex-1 pr-4">
                  <label
                    htmlFor={`item-${item.id}`}
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    {item.name}
                  </label>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Munkadíj:</span>
                      <span>
                        {new Intl.NumberFormat("hu-HU", {
                          style: "currency",
                          currency: "HUF",
                          maximumFractionDigits: 0,
                        }).format(item.workTotal ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anyagköltség:</span>
                      <span>
                        {new Intl.NumberFormat("hu-HU", {
                          style: "currency",
                          currency: "HUF",
                          maximumFractionDigits: 0,
                        }).format(item.materialTotal ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        ({item.quantity} {item.unit} x{" "}
                        {new Intl.NumberFormat("hu-HU", {
                          style: "currency",
                          currency: "HUF",
                          maximumFractionDigits: 0,
                        }).format(
                          item.unitPrice + (item.materialUnitPrice ?? 0)
                        )}
                        )
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-3 border-t pt-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Összesen:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat("hu-HU", {
                        style: "currency",
                        currency: "HUF",
                        maximumFractionDigits: 0,
                      }).format(item.totalPrice ?? 0)}
                    </span>
                  </div>
                </div>
                <Checkbox
                  id={`item-${item.id}`}
                  checked={isItemSelected(item.id!)}
                  onCheckedChange={() => toggleItem(item)}
                  className="h-5 w-5"
                />
              </div>
            ))}
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="mt-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Kiválasztott tételek ({selectedItems.length})
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat("hu-HU", {
                      style: "currency",
                      currency: "HUF",
                      maximumFractionDigits: 0,
                    }).format(currentTotal)}
                  </p>
                </div>
                <Button
                  onClick={handleCreateBilling}
                  disabled={selectedItems.length === 0}
                >
                  Számla létrehozása
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
