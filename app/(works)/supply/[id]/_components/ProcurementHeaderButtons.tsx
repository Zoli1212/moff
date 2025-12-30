"use client";

import { useState } from "react";

interface ProcurementHeaderButtonsProps {
  workId: number;
}

export default function ProcurementHeaderButtons({
  workId,
}: ProcurementHeaderButtonsProps) {
  const [isHoveredQuote, setIsHoveredQuote] = useState(false);
  const [isHoveredOrder, setIsHoveredOrder] = useState(false);
  const [isHoveredAdd, setIsHoveredAdd] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: -8 }}>
      <a
        href={`/supply/${workId}/procurement?type=quote`}
        onMouseEnter={() => setIsHoveredQuote(true)}
        onMouseLeave={() => setIsHoveredQuote(false)}
        style={{
          padding: "6px 12px",
          backgroundColor: isHoveredQuote ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 700,
          fontSize: "13px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: isHoveredQuote
            ? "0 4px 10px rgba(254, 156, 0, 0.3)"
            : "0 2px 6px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
          whiteSpace: "nowrap",
        }}
      >
        Ajánlatkérés
      </a>
      <a
        href={`/supply/${workId}/procurement?type=order`}
        onMouseEnter={() => setIsHoveredOrder(true)}
        onMouseLeave={() => setIsHoveredOrder(false)}
        style={{
          padding: "6px 12px",
          backgroundColor: isHoveredOrder ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 700,
          fontSize: "13px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: isHoveredOrder
            ? "0 4px 10px rgba(254, 156, 0, 0.3)"
            : "0 2px 6px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
          whiteSpace: "nowrap",
        }}
      >
        + IB
      </a>
      <button
        onMouseEnter={() => setIsHoveredAdd(true)}
        onMouseLeave={() => setIsHoveredAdd(false)}
        style={{
          width: 36,
          height: 36,
          minWidth: 36,
          minHeight: 36,
          borderRadius: "50%",
          backgroundColor: "transparent",
          border: "2px solid #FE9C00",
          color: "#FE9C00",
          fontSize: 24,
          fontWeight: "normal",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease-in-out",
          flexShrink: 0,
          padding: 0,
          margin: 0,
          lineHeight: 0,
          boxShadow: isHoveredAdd
            ? "0 4px 10px rgba(254, 156, 0, 0.3)"
            : "0 2px 6px rgba(0, 0, 0, 0.1)",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "block",
            lineHeight: 0,
            transform: "translateY(-2px)",
          }}
        >
          +
        </span>
      </button>
    </div>
  );
}
