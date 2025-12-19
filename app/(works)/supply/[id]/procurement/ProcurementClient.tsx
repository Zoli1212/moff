"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkHeader from "@/components/WorkHeader";
import { X } from "lucide-react";

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  workItemId?: number;
}

export default function ProcurementClient({ workId }: { workId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);

  // Get request type from URL param (quote or order)
  const requestType = (searchParams.get("type") as "quote" | "order") || "quote";

  useEffect(() => {
    // TODO: Fetch materials that are in progress (inProgress: true workItems)
    const fetchMaterials = async () => {
      try {
        // Mock data for now
        setMaterials([
          {
            id: 1,
            name: "Mennyezetfesték",
            quantity: 5,
            unit: "l",
            unitPrice: 3500,
          },
          { id: 2, name: "WC", quantity: 1, unit: "db", unitPrice: 50000 },
          {
            id: 3,
            name: "Zuhanyzó",
            quantity: 1,
            unit: "db",
            unitPrice: 160000,
          },
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching materials:", error);
        setIsLoading(false);
      }
    };

    fetchMaterials();
  }, [workId]);

  const handleMaterialToggle = (materialId: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedMaterials.size === 0) {
      alert("Válassz ki legalább egy anyagot!");
      return;
    }

    const selectedItems = materials.filter((m) =>
      selectedMaterials.has(m.id)
    );

    // TODO: API call to send quote/order request
    console.log("Request type:", requestType);
    console.log("Selected materials:", selectedItems);

    alert(
      `${requestType === "quote" ? "Ajánlatkérés" : "Megrendelés"} elküldve!`
    );
    router.back();
  };

  return (
    <div
      style={{
        maxWidth: 450,
        margin: "0 auto",
        paddingBottom: 120,
        minHeight: "100vh",
        backgroundColor: "#fff",
      }}
    >
      <WorkHeader title="Anyagbeszerzés" />

      <div style={{ padding: "16px" }}>
        {/* Close button */}
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 8,
          }}
        >
          <X size={24} color="#666" />
        </button>

        {/* Materials list */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "#333",
            }}
          >
            Válaszd ki a szükséges anyagokat
          </label>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              Betöltés...
            </div>
          ) : materials.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#999",
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
              }}
            >
              Nincs folyamatban lévő feladathoz tartozó anyag
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {materials.map((material) => {
                const isSelected = selectedMaterials.has(material.id);
                return (
                  <div
                    key={material.id}
                    onClick={() => handleMaterialToggle(material.id)}
                    style={{
                      padding: 16,
                      border: `2px solid ${isSelected ? "#FE9C00" : "#e9ecef"}`,
                      borderRadius: 8,
                      backgroundColor: isSelected ? "#FFF5E6" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: "#333",
                            marginBottom: 4,
                          }}
                        >
                          {material.name}
                        </div>
                        <div style={{ fontSize: 13, color: "#666" }}>
                          {material.quantity} {material.unit}
                          {material.unitPrice &&
                            ` • ${material.unitPrice.toLocaleString("hu-HU")} Ft/${material.unit}`}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          border: `2px solid ${isSelected ? "#FE9C00" : "#ddd"}`,
                          backgroundColor: isSelected ? "#FE9C00" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        {isSelected && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M2 7L5.5 10.5L12 4"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedMaterials.size > 0 && (
          <div
            style={{
              padding: 16,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "#666",
                marginBottom: 4,
              }}
            >
              Kiválasztott tételek
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#FE9C00",
              }}
            >
              {selectedMaterials.size} db
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleSubmit}
            disabled={selectedMaterials.size === 0}
            style={{
              width: "100%",
              padding: "14px 20px",
              border: "none",
              borderRadius: 8,
              backgroundColor: "#FE9C00",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: selectedMaterials.size === 0 ? "not-allowed" : "pointer",
              opacity: selectedMaterials.size === 0 ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {requestType === "quote" ? "Ajánlat kérése" : "Megrendelés leadása"}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              width: "100%",
              padding: "14px 20px",
              border: "2px solid #ddd",
              borderRadius: 8,
              backgroundColor: "#fff",
              color: "#666",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Mégse
          </button>
        </div>
      </div>
    </div>
  );
}
