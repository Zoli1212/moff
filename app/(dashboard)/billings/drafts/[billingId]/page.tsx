"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUserData } from "@/actions/user-actions";
import {
  getBillingById,
  updateBilling,
  finalizeAndGenerateInvoice,
  markAsPaidCash,
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
  taxNumber?: string | null;
  euTaxNumber?: string | null;
  offerId: number;
}

export default function BillingDraftPage() {
  const params = useParams();
  const router = useRouter();
  const billingId = Number(params.billingId as string);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTenant, setIsTenant] = useState<boolean>(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [euTaxNumber, setEuTaxNumber] = useState("");

  // Check if user is tenant
  useEffect(() => {
    getCurrentUserData()
      .then(data => {
        setIsTenant(data.isTenant ?? true);
        if (!data.isTenant) {
          router.push('/dashboard');
        }
      })
      .catch(() => {
        setIsTenant(true);
      });
  }, [router]);

  useEffect(() => {
    if (!isTenant) return;
    const fetchBilling = async () => {
      try {
        setLoading(true);
        if (!billingId) return;
        const data = await getBillingById(billingId);
        if (data) {
          setBilling(data as Billing);
          setEditedTitle(data.title || "");
          setCustomerName("");
          setCustomerCity("");
          setCustomerAddress("");
          setCustomerZip("");
          setTaxNumber(data.taxNumber || "");
          setEuTaxNumber(data.euTaxNumber || "");
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
  }, [billingId, isTenant]);

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

  if (!isTenant) {
    return null; // Will redirect
  }

  const handleUpdateBilling = async () => {
    if (!billing) return;

    // Update the title if it was edited
    if (editedTitle !== billing.title) {
      const updatedBilling = { ...billing, title: editedTitle };
      setBilling(updatedBilling);
    }
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
        title: editedTitle,
        items: itemsToSave,
        taxNumber: taxNumber || null,
        euTaxNumber: euTaxNumber || null,
        customerName: customerName || null,
        customerCity: customerCity || null,
        customerAddress: customerAddress || null,
        customerZip: customerZip || null,
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
      console.log(err);
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
        title: editedTitle,
        items: itemsToSave,
        taxNumber: taxNumber || null,
        euTaxNumber: euTaxNumber || null,
        customerName: customerName || null,
        customerCity: customerCity || null,
        customerAddress: customerAddress || null,
        customerZip: customerZip || null,
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
      console.log(err);
      toast.error("Hiba történt a számla véglegesítésekor.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleMarkAsPaidCash = async () => {
    if (!billing) return;

    setIsMarkingPaid(true);
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
        title: editedTitle,
        items: itemsToSave,
        customerName: customerName || null,
        customerCity: customerCity || null,
        customerAddress: customerAddress || null,
        customerZip: customerZip || null,
      });

      if (!updateResult.success) {
        toast.error(
          updateResult.error ||
            "Hiba történt a piszkozat mentésekor a pénzügyi teljesítés előtt."
        );
        setIsMarkingPaid(false);
        return;
      }

      // If save was successful, proceed to mark as paid cash
      const result = await markAsPaidCash(billing.id);
      if (result.success && result.updatedBilling) {
        setBilling(result.updatedBilling as Billing);
        toast.success("Pénzügyileg teljesítve!");
      } else {
        setError(result.error || "A pénzügyi teljesítés jelölése sikertelen.");
        toast.error(
          result.error || "A pénzügyi teljesítés jelölése sikertelen."
        );
      }
    } catch (err) {
      setError("Hiba történt a pénzügyi teljesítés jelölésekor.");
      console.log(err);
      toast.error("Hiba történt a pénzügyi teljesítés jelölésekor.");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  if (loading) return <p>Betöltés...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!billing) return <p>Nincs megjeleníthető adat.</p>;

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4 pb-24 sm:pb-16">
      <main className="flex-grow w-full mx-auto px-4 max-w-4xl">
        {/* Back button and title */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/billings" className="p-2">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div className="flex-1 px-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full text-center sm:text-left text-xl font-bold text-gray-800 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Számla címe"
            />
          </div>
          <div className="w-8"></div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4 pb-4 border-b">
            {/* Status and action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
              <div className="flex-shrink-0">
                <span className="text-sm text-gray-500">
                  Státusz:
                  <span
                    className={`font-semibold ml-1 ${
                      billing.status === "draft"
                        ? "text-orange-500"
                        : billing.status === "paid_cash"
                          ? "text-green-600"
                          : "text-blue-600"
                    }`}
                  >
                    {billing.status === "draft"
                      ? "Piszkozat"
                      : billing.status === "paid_cash"
                        ? "Pénzügyileg teljesítve"
                        : `Számlázva (${billing.invoiceNumber})`}
                  </span>
                </span>
              </div>

              {/* Customer Fields - Collapsible */}
              <details className="mt-4 border border-gray-300 rounded-md">
                <summary className="px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 flex items-center justify-between">
                  <span>Vevő adatai (számlázáshoz)</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="customerName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Vevő neve *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Kovács János"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerCity"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Város *
                    </label>
                    <input
                      type="text"
                      id="customerCity"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="Budapest"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerAddress"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Utca, házszám
                    </label>
                    <input
                      type="text"
                      id="customerAddress"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Fő utca 1."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerZip"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Irányítószám
                    </label>
                    <input
                      type="text"
                      id="customerZip"
                      value={customerZip}
                      onChange={(e) => setCustomerZip(e.target.value)}
                      placeholder="1011"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </details>

              {/* Tax Number Fields - Collapsible */}
              <details className="mt-4 border border-gray-300 rounded-md">
                <summary className="px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 flex items-center justify-between">
                  <span>Vevői adatszámok</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="taxNumber"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Adószám (opcionális)
                    </label>
                    <input
                      type="text"
                      id="taxNumber"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="12345678-1-23"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="euTaxNumber"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      EU adószám (opcionális)
                    </label>
                    <input
                      type="text"
                      id="euTaxNumber"
                      value={euTaxNumber}
                      onChange={(e) => setEuTaxNumber(e.target.value)}
                      placeholder="HU12345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </details>

              {billing.status === "draft" && hasSelectedItems && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleUpdateBilling}
                    disabled={isSaving}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto font-semibold"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Mentés..." : "Piszkozat mentése"}
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={isFinalizing}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto font-semibold"
                  >
                    {isFinalizing
                      ? "Véglegesítés..."
                      : "Jóváhagyás és Számla Kiállítása"}
                  </Button>
                  <Button
                    onClick={handleMarkAsPaidCash}
                    disabled={isMarkingPaid}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto font-semibold"
                  >
                    {isMarkingPaid ? "Jelölés..." : "Pénzügyileg teljesítve"}
                  </Button>
                </div>
              )}
            </div>

            {billing.invoicePdfUrl && (
              <div className="flex justify-center mt-3">
                <a
                  href={billing.invoicePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  Számla megtekintése
                </a>
              </div>
            )}
          </div>

          {billing.status === "draft" ? (
            <InvoiceItemsTable
              items={editableItems}
              onItemsChange={setEditableItems}
            />
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
