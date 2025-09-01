"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  getBillingById,
  updateBilling,
  finalizeAndGenerateInvoice,
} from "@/actions/billing-actions";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { OfferItem } from "@/types/offer.types";
import { toast } from "sonner";
import { InvoiceItemsTable } from "./_components/InvoiceItemsTable";
import { FinalizedInvoiceItems } from "./_components/FinalizedInvoiceItems";

interface Billing {
  id: number;
  title: string;
  status: string;
  items: OfferItem[];
  totalPrice: number;
  invoiceNumber?: string | null;
  invoicePdfUrl?: string | null;
  offerId: number;
}

export default function BillingDraftPage() {
  const params = useParams();
  const billingId = Number(params.billingId as string);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true);
        if (!billingId) return;
        const data = await getBillingById(billingId);
        if (data) {
          setBilling(data as Billing);
          setEditableItems(
            (data.items || []).map((item: OfferItem) => ({
              ...item,
              id: item.id || Math.random(),
            }))
          );
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

  useEffect(() => {
    if (billing) {
      setEditableItems(
        (billing.items || []).map((item: OfferItem) => ({
          ...item,
          id: item.id || Math.random(),
        }))
      );
    }
  }, [billing]);

  const total = useMemo(() => {
    return editableItems
      .filter((item) => item.isSelected)
      .reduce((acc, item) => {
        const materialTotal =
          parseFloat(String(item.materialTotal).replace(/[^0-9.-]+/g, "")) || 0;
        const workTotal =
          parseFloat(String(item.workTotal).replace(/[^0-9.-]+/g, "")) || 0;
        return acc + materialTotal + workTotal;
      }, 0);
  }, [editableItems]);

  const hasSelectedItems = useMemo(() => {
    return editableItems.some((item) => item.isSelected);
  }, [editableItems]);

  const handleUpdateBilling = async () => {
    if (!billing) return;
    setIsSaving(true);

    const parseCurrency = (value: string | undefined): number => {
      if (!value) return 0;
      const numericValue = String(value)
        .replace(/[^0-9,-]+/g, "")
        .replace(",", ".");
      return parseFloat(numericValue) || 0;
    };

    const itemsToSave = editableItems
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
      const result = await updateBilling(billing.id, {
        title: billing.title,
        items: itemsToSave,
      });
      if (result.success) {
        toast.success("Számlatervezet sikeresen frissítve!");
        if (result.billing) {
          const parsedItems =
            typeof result.billing.items === "string"
              ? JSON.parse(result.billing.items)
              : result.billing.items;
          const updatedBilling: Billing = {
            ...result.billing,
            items: parsedItems,
          };
          setBilling(updatedBilling);
          setEditableItems(
            parsedItems.map((item: OfferItem) => ({
              ...item,
              id: item.id || Math.random(),
            }))
          );
        }
      } else {
        toast.error(result.error || "Hiba történt a mentés során.");
      }
    } catch (err) {
      console.log(err)
      toast.error("Váratlan hiba történt a mentés során.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!billing) return;

    setIsFinalizing(true);
    try {
      // First, save the current state of selected items to ensure consistency
      const parseCurrency = (value: string | undefined): number => {
        if (!value) return 0;
        const numericValue = String(value)
          .replace(/[^0-9,-]+/g, "")
          .replace(",", ".");
        return parseFloat(numericValue) || 0;
      };

      const itemsToSave = editableItems
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

      const updateResult = await updateBilling(billing.id, {
        title: billing.title,
        items: itemsToSave,
      });

      if (!updateResult.success) {
        toast.error(
          updateResult.error ||
            "Hiba történt a piszkozat mentésekor a véglegesítés előtt."
        );
        setIsFinalizing(false);
        return;
      }

      // If save was successful, proceed to finalize
      const result = await finalizeAndGenerateInvoice(billing.id);
      if (result.success && result.updatedBilling) {
        setBilling(result.updatedBilling as Billing);
        toast.success("Számla sikeresen véglegesítve!");
      } else {
        setError(result.error || "A számla véglegesítése sikertelen.");
        toast.error(result.error || "A számla véglegesítése sikertelen.");
      }
    } catch (err) {
      setError("Hiba történt a számla véglegesítésekor.");
      console.log(err)
      toast.error("Hiba történt a számla véglegesítésekor.");
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
          <Link href={`/billings/my-invoices`} className="p-2">
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
            <div className="flex items-center gap-2">
              {billing.status === "draft" && hasSelectedItems && (
                <>
                  <Button
                    onClick={handleUpdateBilling}
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Mentés..." : "Piszkozat mentése"}
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={isFinalizing}
                    size="sm"
                  >
                    {isFinalizing
                      ? "Véglegesítés..."
                      : "Jóváhagyás és Számla Kiállítása"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {billing.status === "draft" ? (
            <InvoiceItemsTable items={editableItems} onItemsChange={setEditableItems} />
          ) : (
            <FinalizedInvoiceItems items={editableItems} />
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <span className="text-lg font-bold text-gray-800">
              Teljes összeg:
            </span>
            <span className="text-xl font-bold text-gray-900">
              {new Intl.NumberFormat("hu-HU", {
                style: "currency",
                currency: "HUF",
                maximumFractionDigits: 0,
              }).format(total)}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
