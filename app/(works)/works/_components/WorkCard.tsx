"use client";
import React from "react";

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
}

const getUrgentColor = (level: "warning" | "danger") => {
  if (level === "danger") return "#e74c3c";
  if (level === "warning") return "#f1c40f";
  return "#bdc3c7";
};

const WorkCard: React.FC<WorkCardProps> = (props) => {
  console.log("WorkCard props:", props);

  const {
    title,
    deadline,
    progress,
    progressPlanned,
    financial,
    financialPlanned,
    urgentTask,
    urgentLevel,
    isUpdating = false,
    isDisabled = false,
    offerItems = [],
    offerDescription = "",
    workSummary = "",
  } = props;

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
        border: "2px solid #f97316",
        borderRadius: 12,
        marginBottom: 24,
        padding: 20,
        background: isUpdating ? "#f8f9fa" : "#fff",
        boxShadow: "0 2px 8px rgba(249, 115, 22, 0.2)",
        maxWidth: 420,
        minHeight: 260,
        opacity: isDisabled ? 0.6 : 1,
        position: "relative",
        overflow: "hidden",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isUpdating && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #3498db, #2ecc71, #3498db)",
            backgroundSize: "200% 100%",
            animation: "loading 2s linear infinite",
          }}
        />
      )}
      <style jsx>{`
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 18 }}>{title}</span>
          {isUpdating && (
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid #3498db",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
        </div>
        <span style={{ color: "#888", fontSize: 14 }}>
          Határidő: {deadline}
        </span>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
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
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Elvégzett / Tervezett munka
        </div>
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
              width: `${progressPlanned > 0 ? (progress / progressPlanned) * 100 : 0}%`,
              background: "#3498db",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {progress} / {progressPlanned}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Pénzügyi teljesítés</div>
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
              width: `${financialPlanned > 0 ? (financial / financialPlanned) * 100 : 0}%`,
              background: "#2ecc71",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {financial} / {financialPlanned}
        </div>
      </div>
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
    </div>
  );
};

export default WorkCard;
