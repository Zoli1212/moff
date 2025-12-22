"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { saveMarketPrice } from "../_actions/save-market-price";

interface MarketOffer {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
}

interface MarketPrice {
  offers?: MarketOffer[];
  lastRun?: string;
  // Legacy single-offer format (backwards compatibility)
  bestPrice?: number;
  supplier?: string;
  url?: string;
  productName?: string;
  savings?: number;
  checkedAt?: string;
}

interface MaterialPriceIndicatorProps {
  workItemId: number;
  quantity: number;
  unit: string;
  materialUnitPrice?: number;
  currentMarketPrice?: MarketPrice | null;
  materialName?: string;
}

export default function MaterialPriceIndicator({
  workItemId,
  quantity,
  unit,
  materialUnitPrice,
  currentMarketPrice: initialMarketPrice,
  materialName,
}: MaterialPriceIndicatorProps) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [localMarketPrice, setLocalMarketPrice] = useState<MarketPrice | null>(
    initialMarketPrice || null
  );
  const [savingOfferId, setSavingOfferId] = useState<number | null>(null);
  const [fetchedOffers, setFetchedOffers] = useState<MarketOffer[]>([]); // Ideiglenesen tároljuk a lekért ajánlatokat

  // Helper to get offers array (handles both new and legacy formats)
  const getOffers = (price: MarketPrice | null): MarketOffer[] => {
    if (!price) return [];
    if (price.offers && Array.isArray(price.offers)) return price.offers;
    // Legacy format - convert to array
    if (price.bestPrice !== undefined) {
      return [{
        bestPrice: price.bestPrice,
        supplier: price.supplier || '',
        url: price.url || '',
        productName: price.productName || '',
        savings: price.savings || 0,
        checkedAt: price.checkedAt || new Date().toISOString(),
      }];
    }
    return [];
  };

  const offers = getOffers(localMarketPrice);
  const bestOffer = offers.length > 0 ? offers[0] : null;

  // Manual price fetch handler
  const handleFetchPrice = async () => {
    if (isFetchingPrice) return;

    setIsFetchingPrice(true);
    toast("Piaci árak lekérdezése...", {
      id: `fetch-price-${workItemId}`,
      duration: 50000,
      style: {
        background: "#dbeafe",
        color: "#1e40af",
        fontSize: 13,
        padding: "6px 18px",
        borderRadius: 8,
        minHeight: 0,
      },
    });

    try {
      const response = await fetch("/api/scrape-material-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workItemId,
          forceRefresh: true,
          materialName: materialName
        }),
      });

      if (response.ok) {
        const data = await response.json();

        toast.dismiss(`fetch-price-${workItemId}`);
        toast.success("Ajánlatok betöltve! Válaszd ki, melyiket szeretnéd menteni.", {
          duration: 4000,
          style: {
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            padding: "6px 18px",
            borderRadius: 8,
          },
        });

        // Tároljuk az ajánlatokat ideiglenesen (NEM mentjük automatikusan!)
        if (data.currentMarketPrice?.offers) {
          setFetchedOffers(data.currentMarketPrice.offers);
          setShowPriceDetails(true);
        }
      } else {
        toast.dismiss(`fetch-price-${workItemId}`);
        toast.error("Hiba történt az árfrissítés során", {
          duration: 3000,
        });
      }
    } catch (error) {
      console.log(error);
      toast.dismiss(`fetch-price-${workItemId}`);
      toast.error("Hiba történt az árfrissítés során", {
        duration: 3000,
      });
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Handler az ajánlat mentésére
  const handleSaveOffer = async (offer: MarketOffer, index: number) => {
    setSavingOfferId(index);

    toast("Ajánlat mentése...", {
      id: `save-offer-${workItemId}-${index}`,
      duration: 5000,
    });

    try {
      const result = await saveMarketPrice({ workItemId, offer });

      if (result.success) {
        toast.dismiss(`save-offer-${workItemId}-${index}`);
        toast.success("Ajánlat sikeresen mentve! 💾", {
          duration: 3000,
          style: {
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            padding: "6px 18px",
            borderRadius: 8,
          },
        });

        // Frissítjük a local state-et a mentett ajánlattal
        setLocalMarketPrice({
          offers: [offer],
          lastRun: new Date().toISOString(),
        });
        setFetchedOffers([]); // Töröljük az ideiglenes ajánlatokat
      } else {
        toast.dismiss(`save-offer-${workItemId}-${index}`);
        toast.error("Hiba történt a mentés során", {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(`save-offer-${workItemId}-${index}`);
      toast.error("Hiba történt a mentés során", {
        duration: 3000,
      });
    } finally {
      setSavingOfferId(null);
    }
  };

  // Price indicator renderer
  const renderPriceIndicator = () => {
    // Ha nincs anyagköltség (materialUnitPrice === 0 vagy null), ne jelenjen meg semmi
    if (!materialUnitPrice || materialUnitPrice === 0) {
      return null;
    }

    // Fetching state
    if (isFetchingPrice) {
      return (
        <div className="flex items-center gap-1 text-blue-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Frissítés...</span>
        </div>
      );
    }

    // No price data - red alert
    if (!bestOffer) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFetchPrice();
          }}
          className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
          title="Kattints a piaci ár lekérdezéséhez"
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Nincs árinfó</span>
        </button>
      );
    }

    const savingsAmount = (bestOffer.savings || 0) * (quantity || 0);
    const offerCount = offers.length;

    // Has savings - green checkmark with amount and product name
    if (bestOffer.savings > 0) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFetchPrice();
          }}
          className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors overflow-hidden"
          style={{ maxWidth: "calc(100% - 32px)" }}
          title={`${bestOffer.productName || "Termék"}\nSpórolás: -${savingsAmount.toLocaleString("hu-HU")} Ft\n${bestOffer.supplier}${offerCount > 1 ? `\n+${offerCount - 1} további ajánlat` : ''}`}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col items-start overflow-hidden min-w-0">
            <span className="text-xs font-semibold whitespace-nowrap">
              -{savingsAmount.toLocaleString("hu-HU")} Ft
              {offerCount > 1 && <span className="ml-1 text-[10px]">({offerCount} ajánlat)</span>}
            </span>
            {bestOffer.productName && (
              <span className="text-xs text-gray-600 truncate w-full">
                {bestOffer.productName}
              </span>
            )}
          </div>
        </button>
      );
    }

    // No better price - green checkmark with product name if available
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleFetchPrice();
        }}
        className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors overflow-hidden"
        style={{ maxWidth: "calc(100% - 32px)" }}
        title={
          bestOffer.productName
            ? `${bestOffer.productName}\n${bestOffer.supplier}${offerCount > 1 ? `\n+${offerCount - 1} további ajánlat` : ''}`
            : "Nincs jobb ajánlat"
        }
      >
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col items-start overflow-hidden min-w-0">
          <span className="text-xs whitespace-nowrap">
            Árinfó OK
            {offerCount > 1 && <span className="ml-1 text-[10px]">({offerCount} ajánlat)</span>}
          </span>
          {bestOffer.productName && (
            <span className="text-xs text-gray-600 truncate w-full">
              {bestOffer.productName}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="mt-2">
      {/* Refresh button - always visible when not fetching */}
      {!isFetchingPrice && materialUnitPrice && materialUnitPrice > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFetchPrice();
          }}
          className="mb-2 px-3 py-1.5 text-xs font-medium text-[#FF9900] bg-white border border-[#FF9900] hover:bg-[#FF9900]/10 rounded-md transition-colors flex items-center gap-1.5"
          title="Árak frissítése"
        >
          <span>🔄</span>
          <span>Árak frissítése</span>
        </button>
      )}

      {/* Lekért ajánlatok (még nem mentve) */}
      {!isFetchingPrice && fetchedOffers.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-blue-600 mb-2">
            💡 Válaszd ki, melyik ajánlatot szeretnéd menteni:
          </div>
          {fetchedOffers.slice(0, 3).map((offer, index) => {
            const savingsAmount = (offer.savings || 0) * (quantity || 0);
            const hasSavings = offer.savings > 0;
            const isSaving = savingOfferId === index;

            return (
              <div
                key={index}
                className={`p-2 rounded-lg border transition-all ${
                  hasSavings
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                    : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300"
                }`}
                style={{ maxWidth: "100%", wordBreak: "break-word" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </span>
                    <span className={`text-xs font-semibold ${hasSavings ? "text-green-700" : "text-gray-700"}`}>
                      {hasSavings ? "Jobb ajánlat" : "Piaci ár"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSavings && (
                      <span className="text-green-700 font-bold text-xs whitespace-nowrap">
                        -{savingsAmount.toLocaleString("hu-HU")} Ft
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveOffer(offer, index);
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 bg-[#FF9900] hover:bg-[#FF9900]/90 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors"
                      title="Ajánlat mentése"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      <span>{isSaving ? "Mentés..." : "Mentés"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {hasSavings ? "Ajánlati ár:" : "Talált ár:"}
                    </span>
                    <span className={`font-semibold ${hasSavings ? "text-green-600" : "text-gray-900"}`}>
                      {offer.bestPrice.toLocaleString("hu-HU")} Ft/{unit || "db"}
                    </span>
                  </div>

                  {hasSavings && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Egységár spórolás:</span>
                      <span className="text-green-600 font-semibold">
                        -{offer.savings.toLocaleString("hu-HU")} Ft/{unit || "db"}
                      </span>
                    </div>
                  )}

                  <div className="text-gray-600 text-[11px] mt-1">📍 {offer.supplier}</div>
                  {offer.productName && (
                    <div className="text-gray-600 text-[11px] truncate">
                      📦 {offer.productName}
                    </div>
                  )}
                  {offer.url && (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 text-[11px] underline block mt-1"
                    >
                      🔗 Termék megtekintése
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : !isFetchingPrice && offers.length > 0 ? (
        // Már mentett ajánlat megjelenítése
        <div className="space-y-2">
          <div className="text-xs font-semibold text-green-600 mb-2">
            ✅ Mentett ajánlat:
          </div>
          {offers.slice(0, 1).map((offer, index) => {
            const savingsAmount = (offer.savings || 0) * (quantity || 0);
            const hasSavings = offer.savings > 0;

            return (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (offer.url) {
                    window.open(offer.url, '_blank');
                  }
                }}
                className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  hasSavings
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:border-green-400"
                    : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 hover:border-gray-400"
                }`}
                style={{ maxWidth: "100%", wordBreak: "break-word" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">💾</span>
                    <span className={`text-xs font-semibold ${hasSavings ? "text-green-700" : "text-gray-700"}`}>
                      {hasSavings ? "Mentett ajánlat" : "Mentett ár"}
                    </span>
                  </div>
                  {hasSavings && (
                    <span className="text-green-700 font-bold text-xs whitespace-nowrap">
                      -{savingsAmount.toLocaleString("hu-HU")} Ft
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {hasSavings ? "Ajánlati ár:" : "Talált ár:"}
                    </span>
                    <span className={`font-semibold ${hasSavings ? "text-green-600" : "text-gray-900"}`}>
                      {offer.bestPrice.toLocaleString("hu-HU")} Ft/{unit || "db"}
                    </span>
                  </div>

                  {hasSavings && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Egységár spórolás:</span>
                      <span className="text-green-600 font-semibold">
                        -{offer.savings.toLocaleString("hu-HU")} Ft/{unit || "db"}
                      </span>
                    </div>
                  )}

                  <div className="text-gray-600 text-[11px] mt-1">📍 {offer.supplier}</div>
                  {offer.productName && (
                    <div className="text-gray-600 text-[11px] truncate">
                      📦 {offer.productName}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : isFetchingPrice ? (
        <div className="flex items-center gap-2">
          {renderPriceIndicator()}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {renderPriceIndicator()}
        </div>
      )}

      {/* Last update timestamp */}
      {localMarketPrice?.lastRun && !isFetchingPrice && offers.length > 0 && (
        <div className="text-gray-500 text-[10px] text-center mt-2">
          📅 Frissítve: {new Date(localMarketPrice.lastRun).toLocaleDateString("hu-HU")}
        </div>
      )}
    </div>
  );
}
