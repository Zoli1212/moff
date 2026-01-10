"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkHeader from "@/components/WorkHeader";
import { X } from "lucide-react";
import ProcurementModal from "./_components/ProcurementModal";

interface MarketOffer {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
}

interface MarketPrice {
  offers?: MarketOffer[];
  lastRun?: string;
  // Legacy format
  bestPrice?: number;
  supplier?: string;
  url?: string;
  productName?: string;
  savings?: number;
  checkedAt?: string;
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
  availableFull?: boolean;
  availableQuantity?: number;
}

export default function ProcurementClient({ workId }: { workId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        // Fetch materials from new API endpoint
        const response = await fetch(`/api/materials?workId=${workId}`);
        if (!response.ok) throw new Error("Failed to fetch materials");

        const data = await response.json();
        const fetchedMaterials = data.materials || [];

        setMaterials(fetchedMaterials);

        // Auto-select materials that are not fully procured
        const notProcuredIds = new Set(
          fetchedMaterials
            .filter(
              (material: Material) =>
                !material.availableFull ||
                (material.availableQuantity !== undefined &&
                  material.availableQuantity < material.quantity)
            )
            .map((material: Material) => material.id)
        );

        setSelectedMaterials(notProcuredIds);
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

  // Get selected materials for export
  const getSelectedMaterials = () => {
    return materials.filter((m) => selectedMaterials.has(m.id));
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

                        {/* Show best market offer if available */}
                        {(() => {
                          const price = material.currentMarketPrice;
                          if (!price) return null;

                          // Get best offer (handles both new and legacy formats)
                          let bestOffer: MarketOffer | null = null;
                          if (price.offers && price.offers.length > 0) {
                            bestOffer = price.offers[0];
                          } else if (price.bestPrice !== undefined) {
                            bestOffer = {
                              bestPrice: price.bestPrice,
                              supplier: price.supplier || '',
                              url: price.url || '',
                              productName: price.productName || '',
                              savings: price.savings || 0,
                              checkedAt: price.checkedAt || '',
                            };
                          }

                          if (!bestOffer || bestOffer.savings <= 0) return null;

                          const offerCount = price.offers?.length || 1;

                          return (
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
                                💰 {offerCount > 1 ? `${offerCount} jobb ajánlat` : 'Jobb ajánlat elérhető'}
                              </div>
                              <div style={{ fontSize: 11, color: "#065f46" }}>
                                <div>
                                  <span style={{ fontWeight: 500 }}>Jelenlegi ár: </span>
                                  {material.materialUnitPrice?.toLocaleString("hu-HU")} Ft/{material.unit}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 500 }}>Legjobb ajánlat: </span>
                                  <span style={{ fontWeight: 700, color: "#047857" }}>
                                    {bestOffer.bestPrice.toLocaleString("hu-HU")} Ft/{material.unit}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ fontWeight: 500 }}>Megtakarítás: </span>
                                  <span style={{ fontWeight: 700, color: "#047857" }}>
                                    -{bestOffer.savings.toLocaleString("hu-HU")} Ft/{material.unit}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4 }}>
                                  📍 {bestOffer.supplier}
                                </div>
                                <div>
                                  📦 {bestOffer.productName}
                                </div>
                                {bestOffer.url && (
                                  <a
                                    href={bestOffer.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      display: "inline-block",
                                      marginTop: 6,
                                      fontSize: 11,
                                      color: "#2563eb",
                                      textDecoration: "underline",
                                      fontWeight: 500,
                                    }}
                                  >
                                    🔗 Megtekintés webshopban
                                  </a>
                                )}
                                {offerCount > 1 && (
                                  <div style={{ marginTop: 6, fontSize: 10, color: "#047857", fontStyle: 'italic' }}>
                                    +{offerCount - 1} további ajánlat elérhető
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
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
            onClick={() => setIsModalOpen(true)}
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
            Ajánlatbekérő küldése
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
            Vissza
          </button>
        </div>
      </div>

      {/* Procurement Modal */}
      <ProcurementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        materials={getSelectedMaterials()}
        workId={workId}
      />
    </div>
  );
}
