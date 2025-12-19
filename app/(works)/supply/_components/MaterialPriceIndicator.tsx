"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface MarketPrice {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
  lastRun?: string;
}

interface MaterialPriceIndicatorProps {
  workItemId: number;
  quantity: number;
  unit: string;
  materialUnitPrice?: number;
  currentMarketPrice?: MarketPrice | null;
}

export default function MaterialPriceIndicator({
  workItemId,
  quantity,
  unit,
  materialUnitPrice,
  currentMarketPrice: initialMarketPrice,
}: MaterialPriceIndicatorProps) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [localMarketPrice, setLocalMarketPrice] = useState<MarketPrice | null>(
    initialMarketPrice || null
  );

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
        body: JSON.stringify({ workItemId, forceRefresh: true }),
      });

      if (response.ok) {
        const data = await response.json();

        toast.dismiss(`fetch-price-${workItemId}`);
        toast.success("Piaci ár frissítve!", {
          duration: 3000,
          style: {
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            padding: "6px 18px",
            borderRadius: 8,
          },
        });

        // Frissítjük a local state-et az új árral
        if (data.currentMarketPrice) {
          setLocalMarketPrice(data.currentMarketPrice);
          setShowPriceDetails(true); // Automatikusan megnyitjuk a részleteket
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
    if (!localMarketPrice) {
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

    const savingsAmount = (localMarketPrice.savings || 0) * (quantity || 0);

    // Has savings - green checkmark with amount and product name
    if (localMarketPrice.savings > 0) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFetchPrice();
          }}
          className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors overflow-hidden"
          style={{ maxWidth: "calc(100% - 32px)" }}
          title={`${localMarketPrice.productName || "Termék"}\nSpórolás: -${savingsAmount.toLocaleString("hu-HU")} Ft\n${localMarketPrice.supplier}`}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col items-start overflow-hidden min-w-0">
            <span className="text-xs font-semibold whitespace-nowrap">
              -{savingsAmount.toLocaleString("hu-HU")} Ft
            </span>
            {localMarketPrice.productName && (
              <span className="text-xs text-gray-600 truncate w-full">
                {localMarketPrice.productName}
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
          localMarketPrice.productName
            ? `${localMarketPrice.productName}\n${localMarketPrice.supplier}`
            : "Nincs jobb ajánlat"
        }
      >
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col items-start overflow-hidden min-w-0">
          <span className="text-xs whitespace-nowrap">Árinfó OK</span>
          {localMarketPrice.productName && (
            <span className="text-xs text-gray-600 truncate w-full">
              {localMarketPrice.productName}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="mt-2">
      {/* Price indicator and toggle button row */}
      <div className="flex items-center gap-2">
        {localMarketPrice &&
          !isFetchingPrice &&
          materialUnitPrice &&
          materialUnitPrice > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPriceDetails(!showPriceDetails);
              }}
              className="text-green-600 hover:text-green-700 transition-colors"
              title={
                showPriceDetails ? "Részletek elrejtése" : "Részletek megjelenítése"
              }
            >
              {showPriceDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        {renderPriceIndicator()}
      </div>

      {/* Market price detailed info */}
      {showPriceDetails && localMarketPrice && !isFetchingPrice && (
        <div
          className={`mt-2 p-2 rounded-lg border overflow-hidden ${
            localMarketPrice.savings > 0
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
          }`}
          style={{ maxWidth: "100%", wordBreak: "break-word" }}
        >
          <div
            className={`text-xs font-semibold mb-1.5 ${
              localMarketPrice.savings > 0 ? "text-green-700" : "text-gray-700"
            }`}
          >
            {localMarketPrice.savings > 0
              ? "💰 Jobb ajánlat elérhető"
              : "ℹ️ Piaci ár információ"}
          </div>
          <div className="text-xs space-y-1" style={{ wordBreak: "break-word" }}>
            {materialUnitPrice && (
              <div>
                <span className="font-medium text-gray-700">Jelenlegi ár: </span>
                <span className="text-gray-900">
                  {materialUnitPrice.toLocaleString("hu-HU")} Ft/{unit || "db"}
                </span>
              </div>
            )}
            {localMarketPrice.bestPrice != null && (
              <div>
                <span className="font-medium text-gray-700">
                  {localMarketPrice.savings > 0 ? "Legjobb ajánlat: " : "Talált ár: "}
                </span>
                <span
                  className={`font-semibold ${
                    localMarketPrice.savings > 0 ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {localMarketPrice.bestPrice.toLocaleString("hu-HU")} Ft/
                  {unit || "db"}
                </span>
              </div>
            )}
            {localMarketPrice.savings > 0 && localMarketPrice.savings != null && (
              <div>
                <span className="font-medium text-gray-700">Megtakarítás: </span>
                <span className="text-green-600 font-semibold">
                  -{localMarketPrice.savings.toLocaleString("hu-HU")} Ft/{unit || "db"}
                </span>
              </div>
            )}
            <div className="text-gray-600 mt-1">
              📍 {localMarketPrice.supplier}
            </div>
            {localMarketPrice.productName && (
              <div className="text-gray-600">
                📦 {localMarketPrice.productName}
              </div>
            )}
            {localMarketPrice.url && (
              <a
                href={localMarketPrice.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline inline-block mt-1"
                style={{ wordBreak: "break-all" }}
              >
                🔗 Megtekintés webshopban
              </a>
            )}
            {localMarketPrice.lastRun && (
              <div className="text-gray-500 mt-1">
                📅 Frissítve:{" "}
                {new Date(localMarketPrice.lastRun).toLocaleDateString("hu-HU")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
