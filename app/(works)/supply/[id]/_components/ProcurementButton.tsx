"use client";

import { useState } from "react";

interface ProcurementButtonProps {
  workId: number;
}

export default function ProcurementButton({ workId }: ProcurementButtonProps) {
  const [isHoveredQuote, setIsHoveredQuote] = useState(false);
  const [isHoveredProcurement, setIsHoveredProcurement] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 65,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 434,
        width: "calc(100% - 16px)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 1000,
        backgroundColor: "#fff",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Ajánlatkérés button - Always opens as quote */}
      <a
        href={`/supply/${workId}/procurement?type=quote`}
        onMouseEnter={() => setIsHoveredQuote(true)}
        onMouseLeave={() => setIsHoveredQuote(false)}
        style={{
          padding: "12px 16px",
          backgroundColor: isHoveredQuote ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 600,
          fontSize: "15px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: isHoveredQuote
            ? "0 4px 12px rgba(254, 156, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
        }}
      >
        Ajánlatkérés
      </a>

      {/* Intelligens beszerzés button - Always opens as order */}
      <a
        href={`/supply/${workId}/procurement?type=order`}
        onMouseEnter={() => setIsHoveredProcurement(true)}
        onMouseLeave={() => setIsHoveredProcurement(false)}
        style={{
          padding: "12px 16px",
          marginBottom: "8px",
          backgroundColor: isHoveredProcurement ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 600,
          fontSize: "15px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: isHoveredProcurement
            ? "0 4px 12px rgba(254, 156, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
        }}
      >
        + Intelligens beszerzés
      </a>
    </div>
  );
}
