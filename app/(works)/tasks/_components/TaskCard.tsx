import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface MarketPrice {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
  lastRun?: string;
}

interface TaskCardProps {
  id: number;
  title: string;
  deadline?: string;
  summary?: string;
  progress?: number;
  quantity?: number;
  completedQuantity?: number;
  unit?: string;
  checked?: boolean;
  isLoading?: boolean;
  onQuantityChange?: (id: number, newQuantity: number) => void;
  onCheck?: (checked: boolean) => void;
  onEdit?: (id: number) => void;
  children?: React.ReactNode;
  className?: string;
  // New billing-related props
  billedQuantity?: number;
  paidQuantity?: number;
  // Market price tracking props
  currentMarketPrice?: MarketPrice | null;
  materialUnitPrice?: number;
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  deadline = "",
  summary = "",
  quantity,
  completedQuantity,
  unit,
  checked = false,
  isLoading = false,
  onQuantityChange,
  onCheck,
  onEdit,
  children,
  className = "",
  billedQuantity,
  paidQuantity,
  currentMarketPrice,
  materialUnitPrice,
}) => {
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [localMarketPrice, setLocalMarketPrice] = useState<MarketPrice | null>(currentMarketPrice || null);

  const handleQuantitySubmit = () => {
    if (onQuantityChange) {
      const quantityValue = parseFloat(newQuantity);
      if (!isNaN(quantityValue)) {
        onQuantityChange(id, quantityValue);
      }
      setShowQuantityModal(false);
      setNewQuantity("");
    }
  };

  // Manual price fetch handler
  const handleFetchPrice = async () => {
    if (isFetchingPrice) return;

    setIsFetchingPrice(true);
    toast("Piaci árak lekérdezése...", {
      id: "fetch-price",
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
        body: JSON.stringify({ workItemId: id, forceRefresh: true }),
      });

      if (response.ok) {
        const data = await response.json();

        toast.dismiss("fetch-price");
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
        toast.dismiss("fetch-price");
        toast.error("Hiba történt az árfrissítés során", {
          duration: 3000,
        });
      }
    } catch (error) {
      toast.dismiss("fetch-price");
      toast.error("Hiba történt az árfrissítés során", {
        duration: 3000,
      });
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Price indicator renderer - MINDEN kártyán megjelenik (kivéve ahol materialUnitPrice === 0)
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

    // No price data - red alert (MINDEN kártyán megjelenik)
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
          className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors max-w-[70%]"
          title={`${localMarketPrice.productName || 'Termék'}\nSpórolás: -${savingsAmount.toLocaleString("hu-HU")} Ft\n${localMarketPrice.supplier}`}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold">
              -{savingsAmount.toLocaleString("hu-HU")} Ft
            </span>
            {localMarketPrice.productName && (
              <span className="text-xs text-gray-600 truncate max-w-full">
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
        className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors max-w-[70%]"
        title={localMarketPrice.productName ? `${localMarketPrice.productName}\n${localMarketPrice.supplier}` : "Nincs jobb ajánlat"}
      >
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-xs">Árinfó OK</span>
          {localMarketPrice.productName && (
            <span className="text-xs text-gray-600 truncate max-w-full">
              {localMarketPrice.productName}
            </span>
          )}
        </div>
      </button>
    );
  };

  const effectiveQuantity = quantity;

  return (
    <div
      className={`w-full max-w-full flex items-start rounded-xl mb-4 p-4 ${checked ? "border-2 border-blue-500 bg-blue-50" : "border border-gray-200 bg-white"} ${className} ${onEdit ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={() => onEdit && onEdit(id)}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="font-bold text-lg" style={{ color: "#FE9C00" }}>
          {title.replace(/^\*\s*/, "")}
        </div>
        {deadline && (
          <div className="text-xs text-gray-500">Határidő: {deadline}</div>
        )}
        {summary && (
          <div className="text-sm mt-1">
            {summary.split(/[.!?]+/)[0] + (summary.includes(".") || summary.includes("!") || summary.includes("?") ? "." : "")}
          </div>
        )}
        {/* Progress bars below */}
        <div className="mt-3 space-y-2">
          <ProgressBar
            label="Teljesített"
            value={completedQuantity || 0}
            max={effectiveQuantity || 100}
            unit={unit || "db"}
            color="bg-blue-500"
          />
          <ProgressBar
            label="Számlázott"
            value={(billedQuantity || 0) + (paidQuantity || 0)}
            max={effectiveQuantity || 0}
            unit={unit || "db"}
            color="bg-green-500"
          />
          <ProgressBar
            label="Számlázható"
            value={Math.max(
              0,
              (completedQuantity || 0) - (billedQuantity || 0) - (paidQuantity || 0)
            )}
            max={effectiveQuantity || 0}
            unit={unit || "db"}
            color="bg-yellow-500"
          />

          {/* Price indicator and quantity button row */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              {localMarketPrice && !isFetchingPrice && materialUnitPrice && materialUnitPrice > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPriceDetails(!showPriceDetails);
                  }}
                  className="text-green-600 hover:text-green-700 transition-colors"
                  title={showPriceDetails ? "Részletek elrejtése" : "Részletek megjelenítése"}
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
            {onQuantityChange && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewQuantity(effectiveQuantity?.toString() || "");
                  setShowQuantityModal(true);
                }}
                className="p-1 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                title="Mennyiség módosítása"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Market price detailed info - csak ha showPriceDetails === true */}
        {showPriceDetails && localMarketPrice && !isFetchingPrice && (
          <div
            className={`mt-3 p-3 rounded-lg border overflow-hidden max-w-full ${
              localMarketPrice.savings > 0
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
            }`}
          >
            <div
              className={`text-xs font-semibold mb-2 ${
                localMarketPrice.savings > 0 ? "text-green-700" : "text-gray-700"
              }`}
            >
              {localMarketPrice.savings > 0
                ? "💰 Jobb ajánlat elérhető"
                : "ℹ️ Piaci ár információ"}
            </div>
            <div className="text-sm space-y-1 overflow-hidden max-w-full">
              {materialUnitPrice && (
                <div className="break-words">
                  <span className="font-medium text-gray-700">Jelenlegi ár: </span>
                  <span className="text-gray-900">
                    {materialUnitPrice.toLocaleString("hu-HU")} Ft/{unit || "db"}
                  </span>
                </div>
              )}
              <div className="break-words">
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
              {localMarketPrice.savings > 0 && (
                <div className="break-words">
                  <span className="font-medium text-gray-700">Megtakarítás: </span>
                  <span className="text-green-600 font-semibold">
                    -{localMarketPrice.savings.toLocaleString("hu-HU")} Ft/{unit || "db"}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-600 mt-1 break-words">
                📍 {localMarketPrice.supplier}
              </div>
              {localMarketPrice.productName && (
                <div className="text-xs text-gray-600 break-words">
                  📦 {localMarketPrice.productName}
                </div>
              )}
              {localMarketPrice.url && (
                <a
                  href={localMarketPrice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline inline-block mt-1 break-all"
                >
                  🔗 Megtekintés webshopban
                </a>
              )}
              {localMarketPrice.lastRun && (
                <div className="text-xs text-gray-500 mt-1">
                  📅 Frissítve: {new Date(localMarketPrice.lastRun).toLocaleDateString("hu-HU")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Render children below progress bar */}
        {children}
      </div>
      {isLoading ? (
        <div className="ml-4 mt-2 w-5 h-5 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : (
        <input
          type="checkbox"
          checked={checked}
          disabled={isLoading}
          onChange={async (e) => {
            e.stopPropagation();
            if (!onCheck) return;
            toast("Frissítés folyamatban ...", {
              id: "frissites",
              duration: 50000,
              style: {
                background: "#d1fae5", // light green
                color: "#065f46", // dark green text
                fontSize: 13,
                padding: "6px 18px",
                borderRadius: 8,
                minHeight: 0,
                boxShadow: "0 2px 8px rgba(16,185,129,0.08)",
              },
              className: "sonner-toast--mini",
            });
            try {
              await onCheck(!checked);
            } finally {
              toast.dismiss("frissites");
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="ml-4 mt-2 w-5 h-5 accent-blue-500 rounded border-gray-300"
        />
      )}

      {/* Quantity modification modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Mennyiség módosítása</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jelenlegi mennyiség: {effectiveQuantity} {unit}
              </label>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Új mennyiség"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                step="0.01"
                min="0"
              />
              {unit && (
                <p className="text-xs text-gray-500 mt-1">
                  Mértékegység: {unit}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleQuantitySubmit}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Módosítás
              </button>
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setNewQuantity("");
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
