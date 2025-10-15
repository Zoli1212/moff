import React, { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  deadline = "",
  summary = "",
  progress = 0,
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
}) => {
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState<string>("");

  console.log(progress);

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

  const effectiveQuantity = quantity;

  console.log(id);
  return (
    <div
      className={`w-full max-w-full flex items-start rounded-xl mb-4 p-4 ${checked ? "border-2 border-blue-500 bg-blue-50" : "border border-gray-200 bg-white"} ${className} ${onEdit ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={() => onEdit && onEdit(id)}
    >
      <div className="flex-1">
        <div className="font-bold text-lg">{title}</div>
        {deadline && (
          <div className="text-xs text-gray-500">Határidő: {deadline}</div>
        )}
        {summary && <div className="text-sm mt-1">{summary}</div>}
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
          {onQuantityChange && (
            <div className="flex justify-end">
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
            </div>
          )}
        </div>
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
