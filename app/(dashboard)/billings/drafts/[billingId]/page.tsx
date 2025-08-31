"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getBillingById,
  finalizeAndGenerateInvoice,
} from "@/actions/billing-actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BillingItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  workTotal?: number;
  materialTotal?: number;
  totalPrice: number;
  description?: string;
}

interface Billing {
  id: number;
  title: string;
  status: string;
  items: BillingItem[];
  totalPrice: number;
  invoiceNumber?: string | null;
  invoicePdfUrl?: string | null;
  offerId: number;
}

export default function BillingDraftPage() {
  const params = useParams();
  const billingId = params.billingId as string;
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true);
        if (!billingId) return;
        const data = await getBillingById(Number(billingId));
        if (data) {
          setBilling(data);
        } else {
          setError("Számlapiszkozat nem található.");
        }
      } catch (err) {
        setError("Hiba történt a piszkozat betöltésekor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, [billingId]);

  const handleFinalize = async () => {
    if (!billing) return;

    setIsFinalizing(true);
    try {
      const result = await finalizeAndGenerateInvoice(billing.id);
      if (result.success && result.updatedBilling) {
        setBilling(result.updatedBilling);
        // Optionally, show a success message
      } else {
        setError(result.error || "A számla véglegesítése sikertelen.");
      }
    } catch (err) {
      setError("Hiba történt a számla véglegesítésekor.");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) return <p>Betöltés...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!billing) return <p>Nincs megjeleníthető adat.</p>;

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4 pb-24">
      <main className="flex-grow w-full mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/billings/${billing.offerId}`} className="p-2">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 truncate">
            {billing.title}
          </h1>
          <div className="w-8"></div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <div>
              <p className="text-sm text-gray-500">Státusz</p>
              <div className="flex flex-col">
                <p
                  className={`font-semibold ${billing.status === "draft" ? "text-orange-500" : "text-green-600"}`}
                >
                  {billing.status === "draft"
                    ? "Piszkozat"
                    : `Számlázva (${billing.invoiceNumber})`}
                </p>
                {billing.invoicePdfUrl && (
                  <a
                    href={billing.invoicePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Számla megtekintése
                  </a>
                )}
              </div>
            </div>
            {billing.status === "draft" && (
              <Button onClick={handleFinalize} disabled={isFinalizing}>
                {isFinalizing
                  ? "Véglegesítés..."
                  : "Jóváhagyás és Számla Kiállítása"}
              </Button>
            )}
          </div>

          <div className="space-y-3 mb-4">
            {billing.items.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div className="flex-1 pr-4">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Munkadíj:</span>
                      <span>{new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(item.workTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anyagköltség:</span>
                      <span>{new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(item.materialTotal ?? 0)}</span>
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
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <span className="text-lg font-bold text-gray-800">
              Teljes összeg:
            </span>
            <span className="text-xl font-bold text-gray-900">
              {new Intl.NumberFormat("hu-HU", {
                style: "currency",
                currency: "HUF",
                maximumFractionDigits: 0,
              }).format(billing.totalPrice)}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
