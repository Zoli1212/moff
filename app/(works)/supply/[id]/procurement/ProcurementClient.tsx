"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkHeader from "@/components/WorkHeader";
import { X } from "lucide-react";

interface MarketPrice {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
  lastRun?: string;
}

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  materialUnitPrice?: number;
  workItemId?: number;
  currentMarketPrice?: MarketPrice | null;
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
    const fetchMaterials = async () => {
      try {
        // Fetch workItems with currentMarketPrice
        const response = await fetch(`/api/work-items?workId=${workId}`);
        if (!response.ok) throw new Error("Failed to fetch work items");

        const data = await response.json();
        const workItems = data.workItems || [];

        // Filter only items that have materials (materialUnitPrice > 0) and are in progress
        const materialsWithPrices: Material[] = workItems
          .filter((item: any) =>
            item.materialUnitPrice &&
            item.materialUnitPrice > 0 &&
            item.inProgress === true
          )
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            materialUnitPrice: item.materialUnitPrice,
            currentMarketPrice: item.currentMarketPrice,
            workItemId: item.id,
          }));

        setMaterials(materialsWithPrices);
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
                          {material.materialUnitPrice &&
                            ` • ${material.materialUnitPrice.toLocaleString("hu-HU")} Ft/${material.unit}`}
                        </div>

                        {/* Show current market price if available */}
                        {material.currentMarketPrice && material.currentMarketPrice.savings > 0 && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 8,
                              backgroundColor: "#d1fae5",
                              borderRadius: 6,
                              border: "1px solid #10b981",
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#065f46", marginBottom: 4 }}>
                              💰 Jobb ajánlat elérhető
                            </div>
                            <div style={{ fontSize: 11, color: "#065f46" }}>
                              <div>
                                <span style={{ fontWeight: 500 }}>Jelenlegi ár: </span>
                                {material.materialUnitPrice?.toLocaleString("hu-HU")} Ft/{material.unit}
                              </div>
                              <div>
                                <span style={{ fontWeight: 500 }}>Legjobb ajánlat: </span>
                                <span style={{ fontWeight: 700, color: "#047857" }}>
                                  {material.currentMarketPrice.bestPrice.toLocaleString("hu-HU")} Ft/{material.unit}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontWeight: 500 }}>Megtakarítás: </span>
                                <span style={{ fontWeight: 700, color: "#047857" }}>
                                  -{material.currentMarketPrice.savings.toLocaleString("hu-HU")} Ft/{material.unit}
                                </span>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                📍 {material.currentMarketPrice.supplier}
                              </div>
                              <div>
                                📦 {material.currentMarketPrice.productName}
                              </div>
                            </div>
                          </div>
                        )}
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
