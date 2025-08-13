"use client";
import React, { useState } from "react";
import type { Material } from "@/types/work";

export interface MaterialSlotsSectionProps {
  materials: Material[];
  workId: number;
}

const MaterialSlotsSection: React.FC<MaterialSlotsSectionProps> = ({ materials, workId }) => {
  const [selected, setSelected] = useState<number[]>([]);

  const handleToggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  // Helper for progress bar width (mock: max 100, else scale)
  const getProgress = (quantity: number) => {
    if (!quantity || isNaN(quantity)) return 0;
    // Cap at 100 for display, or scale as needed
    return Math.min(Math.round(quantity), 100);
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 1px 5px #eee",
        padding: "14px 18px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 17,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        Anyagok ({materials.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {materials.length === 0 && (
          <span style={{ color: "#bbb" }}>Nincs anyag</span>
        )}
        {materials.map((mat) => (
          <div
            key={mat.id}
            style={{
              background: "#f7f7f7",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 15,
              color: "#555",
              marginBottom: 2,
              padding: "7px 12px 10px 12px",
              minHeight: 44,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={selected.includes(mat.id)}
                onChange={() => handleToggle(mat.id)}
                style={{ marginRight: 10, width: 18, height: 18 }}
              />
              <div style={{ flex: 2, fontWeight: 600 }}>{mat.name}</div>
              <div style={{ flex: 1, color: "#888", fontSize: 14 }}>
                {typeof mat.quantity !== "undefined" && mat.quantity !== null ? (
                  <>
                    <span style={{ fontWeight: 600 }}>{mat.quantity}</span>
                    <span style={{ marginLeft: 3 }}>{mat.unit || ""}</span>
                  </>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            {/* Progress bar mock below data */}
            <div style={{ width: "100%", minWidth: 120, maxWidth: 220, marginLeft: 32, marginTop: 2 }}>
              <div
                style={{
                  background: "#e0e0e0",
                  borderRadius: 8,
                  height: 16,
                  width: "100%",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    background: "#4caf50",
                    width: getProgress(Number(mat.quantity)) + "%",
                    height: "100%",
                    borderRadius: 8,
                    transition: "width 0.3s",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 0,
                    fontSize: 12,
                    color: "#222",
                    lineHeight: "16px",
                  }}
                >
                  {mat.quantity} {mat.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MaterialSlotsSection;
