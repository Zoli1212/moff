"use client";

import React from "react";
import { X } from "lucide-react";
import MaterialShareButtons from "../../../_components/MaterialShareButtons";

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  materialUnitPrice?: number;
}

interface ProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
}

export default function ProcurementModal({
  isOpen,
  onClose,
  materials,
}: ProcurementModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease-in-out",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: "calc(100% - 32px)",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={24} color="#666" />
        </button>

        {/* Modal content */}
        <div style={{ marginTop: 8 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#333",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Ajánlatbekérő küldése
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#666",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {materials.length} anyag kiválasztva
          </p>

          {/* Share and Download buttons */}
          <div
            style={{
              padding: 20,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <MaterialShareButtons materials={materials} />
          </div>

          {/* Selected materials list */}
          <div style={{ marginTop: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#333",
                marginBottom: 12,
              }}
            >
              Kiválasztott anyagok:
            </h3>
            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid #e9ecef",
                borderRadius: 8,
                padding: 12,
              }}
            >
              {materials.map((material, index) => (
                <div
                  key={material.id}
                  style={{
                    padding: "8px 0",
                    borderBottom:
                      index < materials.length - 1
                        ? "1px solid #f1f3f5"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#333",
                      marginBottom: 2,
                    }}
                  >
                    {material.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {material.quantity} {material.unit}
                    {material.materialUnitPrice &&
                      ` • ${material.materialUnitPrice.toLocaleString(
                        "hu-HU"
                      )} Ft/${material.unit}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translate(-50%, -40%);
              opacity: 0;
            }
            to {
              transform: translate(-50%, -50%);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </>
  );
}
