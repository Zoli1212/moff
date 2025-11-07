"use client";

import { useState, useEffect } from "react";
import { getBillings } from "@/actions/billing-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import Link from "next/link";
import { X, ChevronDown } from "lucide-react";
import { Billing } from "@prisma/client";
import { useRouter } from "next/navigation";

interface BillingItem {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  materialTotal?: number;
  workTotal?: number;
  totalPrice?: number;
  unitPrice?: number;
  materialUnitPrice?: number;
}

interface BillingWithWork extends Billing {
  work?: {
    title: string;
    totalMaterialCost?: number;
    totalLaborCost?: number;
    totalBilledAmount?: number;
  };
}

interface SelectedBillingData extends Billing {
  workTitle: string;
  invoiceLabel: string;
  invoiceNumberInWork: number;
}

export default function MyInvoicesPage() {
  const router = useRouter();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTenant, setIsTenant] = useState<boolean>(true);
  const [selectedBilling, setSelectedBilling] =
    useState<SelectedBillingData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());

  const toggleWork = (workTitle: string) => {
    setExpandedWorks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workTitle)) {
        newSet.delete(workTitle);
      } else {
        newSet.add(workTitle);
      }
      return newSet;
    });
  };

  // Check if user is tenant
  useEffect(() => {
    getCurrentUserData()
      .then((data) => {
        setIsTenant(data.isTenant ?? true);
        if (!data.isTenant) {
          router.push("/dashboard");
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
      case "pending":
        return "Folyamatban";
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
          <Link
            href="/dashboard"
            className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
            aria-label="Vissza az irányítópultra"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
            <div className="space-y-6">
              {Object.entries(
                billings.reduce(
                  (groups, billing) => {
                    const workTitle =
                      (billing as BillingWithWork).work?.title ||
                      "Ismeretlen munka";
                    if (!groups[workTitle]) {
                      groups[workTitle] = [];
                    }
                    groups[workTitle].push(billing);
                    return groups;
                  },
                  {} as Record<string, typeof billings>
                )
              ).map(([workTitle, workBillings]) => {
                const isExpanded = expandedWorks.has(workTitle);

                // Sum draft invoices separately
                const draftAmount = workBillings
                  .filter((b) => b.status === "draft")
                  .reduce((sum, b) => sum + b.totalPrice, 0);

                return (
                  <div
                    key={workTitle}
                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleWork(workTitle)}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <ChevronDown
                          className={`h-5 w-5 text-[#FE9C00] transition-transform flex-shrink-0 mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
                        />
                        <div className="flex-1 text-left space-y-2">
                          <h2 className="text-lg font-semibold text-[#FE9C00]">
                            {workTitle}
                          </h2>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                Eddig számlázott:
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                                {new Intl.NumberFormat("hu-HU", {
                                  maximumFractionDigits: 0,
                                }).format(
                                  (workBillings[0] as BillingWithWork)?.work
                                    ?.totalBilledAmount || 0
                                )}{" "}
                                Ft
                              </span>
                            </div>
                            {(workBillings[0] as BillingWithWork)?.work && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                  Teljes érték:
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                                  {new Intl.NumberFormat("hu-HU", {
                                    maximumFractionDigits: 0,
                                  }).format(
                                    ((workBillings[0] as BillingWithWork).work
                                      ?.totalMaterialCost || 0) +
                                      ((workBillings[0] as BillingWithWork).work
                                        ?.totalLaborCost || 0)
                                  )}{" "}
                                  Ft
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-gray-500">
                            {
                              workBillings.filter((b) => b.status !== "draft")
                                .length
                            }{" "}
                            számla
                            {workBillings.filter((b) => b.status === "draft")
                              .length > 0 && (
                              <span className="ml-2">
                                •{" "}
                                {
                                  workBillings.filter(
                                    (b) => b.status === "draft"
                                  ).length
                                }{" "}
                                piszkozat
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-3">
                        {workBillings
                          .filter((b) => b.status !== "draft")
                          .map((billing, index) => {
                            // Calculate invoice number within this work (excluding drafts)
                            const invoiceNumberInWork = index + 1;

                            // Determine label based on status
                            const invoiceLabel =
                              billing.status === "paid_cash"
                                ? "Pénzügyileg teljesített"
                                : "Számla";

                            return (
                              <div
                                key={billing.id}
                                className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ml-4"
                                onClick={() => {
                                  setSelectedBilling({
                                    ...billing,
                                    workTitle,
                                    invoiceLabel,
                                    invoiceNumberInWork,
                                  });
                                  setShowModal(true);
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium text-[#FE9C00]">
                                      {invoiceLabel} {invoiceNumberInWork}
                                    </h3>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {new Date(
                                        billing.createdAt
                                      ).toLocaleDateString("hu-HU")}
                                      {billing.invoiceNumber && (
                                        <span className="ml-2">
                                          • Számlaszám: {billing.invoiceNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {billing.status !== "paid_cash" && (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        billing.status === "pending"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
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
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Invoice Details Modal */}
      {showModal && selectedBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#FE9C00] to-[#FE9C00]/90 p-4 flex justify-between items-start rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">
                  {selectedBilling.workTitle}
                </h2>
                <div className="text-sm text-white/90 mt-2">
                  {new Date(selectedBilling.createdAt).toLocaleDateString(
                    "hu-HU"
                  )}
                  {selectedBilling.invoiceNumber && (
                    <span className="ml-2">
                      • Számlaszám: {selectedBilling.invoiceNumber}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-white/80 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Items */}
              {Array.isArray(selectedBilling.items) &&
              selectedBilling.items.length > 0 ? (
                <div className="space-y-4">
                  {(selectedBilling.items as unknown as BillingItem[]).map(
                    (item: BillingItem, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 bg-white"
                      >
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {index + 1}. {item.name}
                        </h3>

                        {item.description && (
                          <div className="text-sm text-gray-600 mb-3 pb-3 border-b">
                            {item.description}
                          </div>
                        )}

                        {/* Price Grid - Same layout as offer-detail-mobile */}
                        <div className="mt-3 text-sm">
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Anyag
                                  </th>
                                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Díj
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                <tr>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                                    Egységár ({item.unit || "db"})
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-right text-gray-600">
                                    {new Intl.NumberFormat("hu-HU", {
                                      style: "currency",
                                      currency: "HUF",
                                      maximumFractionDigits: 0,
                                    }).format(item.materialUnitPrice || 0)}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-right text-gray-600">
                                    {new Intl.NumberFormat("hu-HU", {
                                      style: "currency",
                                      currency: "HUF",
                                      maximumFractionDigits: 0,
                                    }).format(item.unitPrice || 0)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <div className="py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                                      Számlázott mennyiség
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">
                                      {item.quantity} {item.unit || "db"}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                                      Anyag
                                    </div>
                                    <div className="text-sm font-normal text-gray-600">
                                      {new Intl.NumberFormat("hu-HU", {
                                        style: "currency",
                                        currency: "HUF",
                                        maximumFractionDigits: 0,
                                      }).format(item.materialTotal || 0)}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                                      Díj
                                    </div>
                                    <div className="text-sm font-normal text-gray-600">
                                      {new Intl.NumberFormat("hu-HU", {
                                        style: "currency",
                                        currency: "HUF",
                                        maximumFractionDigits: 0,
                                      }).format(item.workTotal || 0)}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Nincsenek tételek
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Anyagköltség összesen:</span>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat("hu-HU", {
                      style: "currency",
                      currency: "HUF",
                      maximumFractionDigits: 0,
                    }).format(
                      (
                        selectedBilling.items as unknown as BillingItem[]
                      )?.reduce(
                        (sum, item) => sum + (item.materialTotal || 0),
                        0
                      ) || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Munkadíj összesen:</span>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat("hu-HU", {
                      style: "currency",
                      currency: "HUF",
                      maximumFractionDigits: 0,
                    }).format(
                      (
                        selectedBilling.items as unknown as BillingItem[]
                      )?.reduce(
                        (sum, item) => sum + (item.workTotal || 0),
                        0
                      ) || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-bold border-t pt-3">
                  <span className="text-gray-900">Mindösszesen:</span>
                  <span className="text-[#FE9C00]">
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
