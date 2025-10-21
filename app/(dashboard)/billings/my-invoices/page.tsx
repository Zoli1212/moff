"use client";

import { useState, useEffect } from "react";
import { getBillings } from "@/actions/billing-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import Link from "next/link";
import { ArrowLeft, X } from 'lucide-react';
import { Billing } from '@prisma/client';
import { useRouter } from "next/navigation";

export default function MyInvoicesPage() {
  const router = useRouter();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTenant, setIsTenant] = useState<boolean>(true);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

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
    
    const loadBillings = async () => {
      try {
        const data = await getBillings();
        setBillings(data as Billing[]);
      } catch (error) {
        console.error("Error loading billings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillings();
  }, [isTenant]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return "Piszkozat";
      case "issued":
        return "Kiállítva";
      case "paid":
        return "Fizetve";
      default:
        return status;
    }
  };

  if (!isTenant) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="p-2">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Számláim</h1>
            <div className="w-8"></div>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : billings.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center">
              <p className="text-gray-500">Nincsenek kiállított számlák.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {billings.map((billing, index) => {
                // Calculate invoice number within work (count billings with same workId up to this point)
                const invoiceNumberInWork = billings
                  .slice(0, index + 1)
                  .filter(b => b.workId === billing.workId)
                  .length;
                
                // Get work title from billing.work if available
                const workTitle = (billing as any).work?.title || "Ismeretlen munka";
                
                // Determine label based on status
                const invoiceLabel = billing.status === "paid_cash" 
                  ? "Pénzügyileg teljesített" 
                  : "Számla";
                
                return (
                  <div 
                    key={billing.id} 
                    className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedBilling({ ...billing, workTitle, invoiceLabel, invoiceNumberInWork });
                      setShowModal(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {workTitle} - {invoiceLabel} {invoiceNumberInWork}
                        </h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(billing.createdAt).toLocaleDateString('hu-HU')}
                          {billing.invoiceNumber && (
                            <span className="ml-2">• Számlaszám: {billing.invoiceNumber}</span>
                          )}
                        </div>
                      </div>
                      {billing.status !== "paid_cash" && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                          {getStatusDisplay(billing.status)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <div className="font-semibold text-gray-900">
                        {new Intl.NumberFormat("hu-HU", {
                          style: "currency",
                          currency: "HUF",
                          maximumFractionDigits: 0,
                        }).format(billing.totalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Invoice Details Modal */}
      {showModal && selectedBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedBilling.workTitle} - {selectedBilling.invoiceLabel} {selectedBilling.invoiceNumberInWork}
                </h2>
                <div className="text-sm text-gray-500 mt-1">
                  Kelte: {new Date(selectedBilling.createdAt).toLocaleDateString('hu-HU')}
                  {selectedBilling.invoiceNumber && (
                    <span className="ml-2">• Számlaszám: {selectedBilling.invoiceNumber}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Számlázott tételek:</h3>
              {selectedBilling.items && selectedBilling.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedBilling.items.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            Mennyiség: {item.quantity} {item.unit || 'db'}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-gray-900">
                            {new Intl.NumberFormat("hu-HU", {
                              style: "currency",
                              currency: "HUF",
                              maximumFractionDigits: 0,
                            }).format(item.totalPrice || (item.quantity * item.unitPrice))}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Intl.NumberFormat("hu-HU", {
                              style: "currency",
                              currency: "HUF",
                              maximumFractionDigits: 0,
                            }).format(item.unitPrice)} / {item.unit || 'db'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Nincsenek tételek
                </div>
              )}

              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Végösszeg:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat("hu-HU", {
                      style: "currency",
                      currency: "HUF",
                      maximumFractionDigits: 0,
                    }).format(selectedBilling.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
