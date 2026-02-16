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
        bottom: 68,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 434,
        width: "calc(100% - 32px)",
        display: "flex",
        flexDirection: "row",
        gap: "10px",
        padding: "8px 0",
        backgroundColor: "#fff",
        zIndex: 1000,
      }}
    >
      {/* Ajánlatkérés button - Always opens as quote */}
      <a
        href={`/supply/${workId}/procurement?type=quote`}
        onMouseEnter={() => setIsHoveredQuote(true)}
        onMouseLeave={() => setIsHoveredQuote(false)}
        style={{
          flex: 1,
          padding: "10px 8px",
          backgroundColor: isHoveredQuote ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 600,
          fontSize: "13px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
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
          flex: 1,
          padding: "10px 8px",
          backgroundColor: isHoveredProcurement ? "#FFF5E6" : "#fff",
          color: "#FE9C00",
          borderRadius: "8px",
          border: "2px solid #FE9C00",
          fontWeight: 600,
          fontSize: "13px",
          textAlign: "center",
          textDecoration: "none",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
        }}
      >
        + Int. beszerzés
      </a>
    </div>
  );
}
