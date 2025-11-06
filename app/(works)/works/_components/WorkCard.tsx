"use client";
import React, { useState } from "react";
import { deleteStuckWork } from "@/actions/work-cleanup-actions";
import { toast } from "sonner";
import type { OfferItem } from "@/types/offer.types";

export interface WorkCardProps {
  id: number;
  title: string;
  deadline: string;
  summary: string;
  progress: number;
  progressPlanned: number;
  financial: number;
  financialPlanned: number;
  urgentTask: string;
  urgentLevel: "warning" | "danger";
  offerItems?: OfferItem[];
  location?: string;
  offerDescription?: string;
  estimatedDuration?: string;
  workSummary?: string;
  isUpdating?: boolean;
  isDisabled?: boolean;
  processingByAI?: boolean; // AI processing in progress
  isStuck?: boolean; // Processing failed after 5 minutes
  isTenant?: boolean; // Show financial data only for tenants
  // Új aggregált értékek
  totalCompleted?: number;
  totalBilled?: number;
  totalBillable?: number;
  totalQuantity?: number; // Összes tervezett mennyiség
}

const getUrgentColor = (level: "warning" | "danger") => {
  if (level === "danger") return "#e74c3c";
  if (level === "warning") return "#f1c40f";
  return "#bdc3c7";
};

const WorkCard: React.FC<WorkCardProps> = (props) => {
  const {
    id,
    title,
    deadline,
    urgentTask,
    urgentLevel,
    isUpdating = false,
    isDisabled = false,
    processingByAI = false,
    isStuck = false,
    isTenant = true, // Default to true for backward compatibility
    offerItems = [],
    offerDescription = "",
    workSummary = "",
    totalCompleted = 0,
    totalBilled = 0,
    totalBillable = 0,
    totalQuantity = 0,
  } = props;

  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show loader if either isUpdating or processingByAI is true
  const showLoader = isUpdating || processingByAI;
  const isClickDisabled = isDisabled || processingByAI;

  // Show error modal if stuck
  React.useEffect(() => {
    if (isStuck) {
      setShowModal(true);
    }
  }, [isStuck]);

  const handleDeleteWork = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteStuckWork(id);
      if (result.success) {
        toast.success(result.message || "Munka törölve");
        setShowModal(false);
        // Refresh the page
        window.location.reload();
      } else {
        toast.error(result.error || "Hiba történt a törlés során");
      }
    } catch (error) {
      console.log(error)
      toast.error("Hiba történt a törlés során");
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate display text: workSummary first, then offerItems, then offerDescription, then fallback
  const getDisplayText = () => {
    // First priority: workSummary (AI generated summary)
    if (workSummary && typeof workSummary === "string" && workSummary.trim()) {
      return workSummary.length > 80
        ? workSummary.substring(0, 80) + "..."
        : workSummary;
    }

    // Second priority: offerItems
    if (offerItems && Array.isArray(offerItems) && offerItems.length > 0) {
      const itemsText = offerItems
        .slice(0, 2)
        .map((item) => item.name || item.description || "")
        .filter(Boolean)
        .join(", ");
      if (itemsText) {
        return itemsText.length > 80
          ? itemsText.substring(0, 80) + "..."
          : itemsText;
      }
    }

    // Third priority: offerDescription
    if (offerDescription && typeof offerDescription === "string") {
      return offerDescription.length > 80
        ? offerDescription.substring(0, 80) + "..."
        : offerDescription;
    }

    // Fallback: hardcoded text
    return "Munka összefoglaló";
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        marginBottom: 16,
        padding: 16,
        background: showLoader ? "#f8f9fa" : "#fff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        maxWidth: 420,
        minHeight: 260,
        opacity: isClickDisabled ? 0.6 : 1,
        position: "relative",
        overflow: "hidden",
        cursor: isClickDisabled ? "not-allowed" : "pointer",
        transition: "box-shadow 0.15s ease-in-out",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        if (!isClickDisabled) {
          e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isClickDisabled) {
          e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
        }
      }}
    >
      {showLoader && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 48,
            height: 48,
            border: "4px solid #FEF3E6",
            borderTop: "4px solid #FE9C00",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            zIndex: 10,
          }}
        />
      )}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 18, color: "#FE9C00" }}>{title}</span>
      </div>
      <div
        style={{
          margin: "8px 0",
          color: "#555",
          fontSize: 14,
          lineHeight: "1.4",
          minHeight: "40px",
          maxHeight: "60px",
          overflow: "hidden",
        }}
      >
        {getDisplayText()}
      </div>
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>
          Határidő: {deadline}
        </span>
      </div>
      {/* Teljesített - Only for tenants */}
      {isTenant && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Teljesített</div>
        <div
          style={{
            background: "#eee",
            borderRadius: 6,
            height: 10,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: `${totalQuantity > 0 ? (totalCompleted / totalQuantity) * 100 : 0}%`,
              background: "#2ecc71",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {totalQuantity > 0 ? `${((totalCompleted / totalQuantity) * 100).toFixed(0)}%` : "0%"}
        </div>
      </div>
      )}
      {/* Számlázott - Only for tenants */}
      {isTenant && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Számlázott</div>
        <div
          style={{
            background: "#eee",
            borderRadius: 6,
            height: 10,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: `${totalQuantity > 0 ? (totalBilled / totalQuantity) * 100 : 0}%`,
              background: "#3498db",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {totalQuantity > 0 ? `${((totalBilled / totalQuantity) * 100).toFixed(0)}%` : "0%"}
        </div>
      </div>
      )}
      {/* Számlázható - Only for tenants */}
      {isTenant && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Számlázható</div>
        <div
          style={{
            background: "#eee",
            borderRadius: 6,
            height: 10,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: `${totalQuantity > 0 ? (totalBillable / totalQuantity) * 100 : 0}%`,
              background: "#f39c12",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {totalQuantity > 0 ? `${((totalBillable / totalQuantity) * 100).toFixed(0)}%` : "0%"}
        </div>
      </div>
      )}
      {urgentTask && (
        <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
          <span style={{ display: "flex", alignItems: "center", marginRight: 8 }}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={urgentLevel === "danger" ? "#e74c3c" : "#f1c40f"}
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "inline", verticalAlign: "middle" }}
            >
              <path d="M12 3L2 21h20L12 3z" />
              <circle cx="12" cy="16" r="1.2" fill="#fff" />
              <rect x="11.2" y="9" width="1.6" height="5" rx="0.8" fill="#fff" />
            </svg>
          </span>
          <span
            style={{
              fontSize: 14,
              color: getUrgentColor(urgentLevel),
              fontWeight: 500,
            }}
          >
            {urgentTask}
          </span>
        </div>
      )}

      {/* Error Modal for Stuck Works */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: "#e74c3c", marginBottom: 8 }}>
                Feldolgozás nem sikerült
              </h3>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
                Az AI feldolgozás 5 perc alatt nem fejeződött be. A munka törlésre kerül, de az ajánlat megmarad.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#666",
                  backgroundColor: "#f5f5f5",
                  border: "none",
                  borderRadius: 8,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                Mégse
              </button>
              <button
                onClick={handleDeleteWork}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor: "#e74c3c",
                  border: "none",
                  borderRadius: 8,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                {isDeleting ? "Törlés..." : "Munka törlése"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCard;
