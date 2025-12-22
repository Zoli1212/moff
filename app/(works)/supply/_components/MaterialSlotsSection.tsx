"use client";
import React, { useState } from "react";
import type { Material } from "@/types/work";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import MaterialAddModal from "./MaterialAddModal";
import MaterialEditModal from "./MaterialEditModal";
import MaterialPriceIndicator from "./MaterialPriceIndicator";
import {
  addMaterial,
  updateMaterial,
  deleteMaterial,
  setMaterialAvailableFull,
  removeMaterialFromWorkEverywhere,
} from "@/actions/materials-action";

import type { WorkItem } from "@/types/work";
export interface MaterialSlotsSectionProps {
  materials: Material[];
  workId: number;
  workItems: WorkItem[];
}

const MaterialSlotsSection: React.FC<MaterialSlotsSectionProps> = ({
  materials: initialMaterials,
  workId,
  workItems,
}) => {
  // Szűrés: csak azok az anyagok jelenjenek meg, amelyek olyan workItemhez tartoznak, ami inProgress
  const inProgressWorkItemIds = workItems.filter(wi => wi.inProgress).map(wi => wi.id);
  const filteredMaterials = initialMaterials.filter(mat => inProgressWorkItemIds.includes(mat.workItemId));
  
  // Összesítés név szerint - azonos nevű anyagok összevonása
  const aggregatedMaterials = filteredMaterials.reduce((acc, mat) => {
    const existingIndex = acc.findIndex(item => item.name.toLowerCase() === mat.name.toLowerCase());
    
    if (existingIndex >= 0) {
      // Ha már létezik ilyen nevű anyag, összesítjük a mennyiségeket
      acc[existingIndex] = {
        ...acc[existingIndex],
        quantity: acc[existingIndex].quantity + mat.quantity,
        availableQuantity: (acc[existingIndex].availableQuantity ?? 0) + (mat.availableQuantity ?? 0),
        // Több workItem ID-t tárolunk egy tömbben
        workItemIds: [...(acc[existingIndex].workItemIds || [acc[existingIndex].workItemId]), mat.workItemId],
        // Az availableFull akkor true, ha az összesített mennyiség teljes
        availableFull: ((acc[existingIndex].availableQuantity ?? 0) + (mat.availableQuantity ?? 0)) >= (acc[existingIndex].quantity + mat.quantity)
      };
    } else {
      // Új anyag hozzáadása
      acc.push({
        ...mat,
        workItemIds: [mat.workItemId] // Tömb formában tároljuk a workItem ID-kat
      });
    }
    
    return acc;
  }, [] as (Material & { workItemIds?: number[] })[]);
  
  const [materials, setMaterials] = useState<(Material & { workItemIds?: number[] })[]>(aggregatedMaterials);
  const [selected, setSelected] = useState<number[]>(() =>
    initialMaterials
      .filter(
        (mat) =>
          mat.availableFull &&
          Math.round(mat.availableQuantity ?? 0) === Math.round(mat.quantity)
      )
      .map((mat) => mat.id)
  );
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleToggle = async (id: number) => {
    const mat = materials.find((m) => m.id === id);
    if (!mat) return;
    const willBeChecked = !selected.includes(id);
    setLoadingIds((prev) => [...prev, id]);
    try {
      if (willBeChecked) {
        // Összesített anyag esetén az összes kapcsolódó workItem anyagát frissítjük
        if (mat.workItemIds && mat.workItemIds.length > 1) {
          // Több workItem-hez tartozó anyag - az összes eredeti anyagot frissítjük
          const originalMaterials = initialMaterials.filter(original => 
            mat.workItemIds!.includes(original.workItemId) && 
            original.name.toLowerCase() === mat.name.toLowerCase()
          );
          
          // Az összes eredeti anyagot teljesre állítjuk
          for (const originalMat of originalMaterials) {
            await setMaterialAvailableFull(originalMat.id);
          }
          
          // Helyi state frissítése
          setMaterials((prev) =>
            prev.map((m) => (m.id === id ? { 
              ...m, 
              availableQuantity: m.quantity,
              availableFull: true 
            } : m))
          );
        } else {
          // Egyszerű eset - egy workItem-hez tartozó anyag
          const updated = await setMaterialAvailableFull(id);
          setMaterials((prev) =>
            prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
          );
        }
        setSelected((prev) => [...prev, id]);
        toast.success("Anyag elérhetőként beállítva!");
      } else {
        // Unchecking logic - összesített anyag esetén az összes kapcsolódó anyagot nullázzuk
        if (mat.workItemIds && mat.workItemIds.length > 1) {
          const originalMaterials = initialMaterials.filter(original => 
            mat.workItemIds!.includes(original.workItemId) && 
            original.name.toLowerCase() === mat.name.toLowerCase()
          );
          
          // Az összes eredeti anyagot nullázzuk
          for (const originalMat of originalMaterials) {
            await updateMaterial({
              id: originalMat.id,
              availableQuantity: 0,
              availableFull: false,
            });
          }
          
          // Helyi state frissítése
          setMaterials((prev) =>
            prev.map((m) => (m.id === id ? { 
              ...m, 
              availableQuantity: 0,
              availableFull: false 
            } : m))
          );
        } else {
          // Egyszerű eset
          const updated = await updateMaterial({
            id,
            availableQuantity: 0,
            availableFull: false,
          });
          setMaterials((prev) =>
            prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
          );
        }
        setSelected((prev) => prev.filter((mid) => mid !== id));
        toast.success("Anyag elérhetőség visszaállítva!");
      }
    } catch (err) {
      toast.error(
        "Hiba az elérhetőség frissítésekor: " + (err as Error).message
      );
    } finally {
      setLoadingIds((prev) => prev.filter((lid) => lid !== id));
    }
  };

  // Helper for progress bar width based on availableQuantity/quantity
  const getProgress = (available: number, total: number) => {
    if (!total || isNaN(available)) return 0;
    return Math.min(Math.round((available / total) * 100), 100);
  };



  // Add
  const handleAddMaterial = async (data: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    workItemId: number;
  }) => {
    try {
      const newMat = await addMaterial({ ...data, workId });
      toast.success("Anyag sikeresen hozzáadva!");
      setMaterials((prev) => [...prev, newMat]);
    } catch (err) {
      console.error("Anyag hozzáadása sikertelen:", err);
      toast.error("Hiba történt az anyag hozzáadásakor!");
    }
  };

  // Edit
  const handleEditMaterial = async (data: {
    id: number;
    name: string;
    quantity: number;
    availableQuantity: number;
    unit: string;
  }) => {
    try {
      const updated = await updateMaterial(data);
      toast.success("Anyag sikeresen frissítve!");
      setEditMaterial(null);
      setMaterials((prev) =>
        prev.map((mat) =>
          mat.id === updated.id ? { ...mat, ...updated } : mat
        )
      );
    } catch (err) {
      console.error("Anyag szerkesztése sikertelen:", err);
      toast.error("Hiba történt az anyag szerkesztésekor!");
    }
  };

  // Delete
  const handleDeleteMaterial = async (id: number) => {
    try {
      await deleteMaterial(id);
      toast.success("Anyag törölve!");
      setEditMaterial(null);
      setMaterials((prev) => prev.filter((mat) => mat.id !== id));
    } catch (err) {
      console.error("Anyag törlése sikertelen:", err);
      toast.error("Hiba történt az anyag törlésekor!");
    }
  };

  const setEditMaterialOpen = (open: boolean) => {
    if (!open) setEditMaterial(null);
  };

  return (
    <>
      <MaterialAddModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddMaterial}
        workItems={workItems}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 18, marginTop: 8 }}>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="outline"
          aria-label="Új anyag hozzáadása"
          className="border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
          style={{ 
            width: 32, 
            height: 32, 
            minWidth: 32, 
            minHeight: 32, 
            borderRadius: '50%', 
            padding: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 18,
            lineHeight: 1
          }}
        >
          +
        </Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm px-5 py-3 mb-5">
        <div className="flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pb-20">
          {materials.length === 0 && (
            <span className="text-[#bbb]">Nincs anyag</span>
          )}
          <MaterialEditModal
            open={!!editMaterial}
            onOpenChange={setEditMaterialOpen}
            material={editMaterial}
            workItems={workItems}
            onSubmit={handleEditMaterial}
            onDelete={handleDeleteMaterial}
          />
          {materials.map((mat) => (
            <div key={mat.id}>
              <div
                className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1 relative"
              >
                {/* Edit and Delete icons in top right corner */}
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditMaterial(mat);
                    }}
                    className="p-1.5"
                    aria-label="Anyag szerkesztése"
                  >
                    <Pencil className="w-4 h-4 text-[#FF9900]" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Delete material only from the workItems that are aggregated
                        const workItemIdsToDelete = mat.workItemIds || [mat.workItemId];
                        await removeMaterialFromWorkEverywhere(workId, mat.name, workItemIdsToDelete);
                        
                        toast.success("Az anyag sikeresen törölve a munkáról!");
                        // Remove all aggregated materials with the same name
                        setMaterials((prev) => prev.filter((m) => m.name.toLowerCase() !== mat.name.toLowerCase()));
                      } catch (err) {
                        toast.error("Hiba a törlés során: " + (err as Error).message);
                      }
                    }}
                    className="p-1.5"
                    aria-label="Anyag törlése"
                  >
                    <Trash2 className="w-4 h-4 text-[#FF9900]" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 pr-12">
                  <input
                    type="checkbox"
                    checked={selected.includes(mat.id)}
                    disabled={loadingIds.includes(mat.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle(mat.id);
                    }}
                    className="mr-2.5 w-[18px] h-[18px] accent-green-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 font-semibold flex items-center gap-3 overflow-hidden">
                    <span className="truncate">{mat.name.charAt(0).toUpperCase() + mat.name.slice(1)}</span>
                    <div className="font-semibold text-[14px] text-[#222] flex items-center flex-shrink-0">
                      {typeof mat.quantity !== "undefined" &&
                      mat.quantity !== null ? (
                        <>
                          <span>{mat.availableQuantity ?? 0}</span>
                          <span className="mx-1">/</span>
                          <span>{mat.quantity}</span>
                          <span className="ml-1">{mat.unit}</span>
                        </>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-2/3 mt-2">
                  <div className="bg-[#e0e0e0] rounded-lg h-4 w-full overflow-hidden relative">
                    <div
                      className={
                        `h-4 transition-all ` +
                        ((mat.availableQuantity ?? 0) >= mat.quantity
                          ? "bg-green-500"
                          : "bg-yellow-400")
                      }
                      style={{
                        width: `${getProgress(mat.availableQuantity ?? 0, mat.quantity ?? 0)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Price indicator for each material */}
                {(() => {
                  // Find the first workItem that has this material
                  const relatedWorkItem = workItems.find(
                    (wi) => mat.workItemIds?.includes(wi.id) || wi.id === mat.workItemId
                  );

                  if (relatedWorkItem) {
                    return (
                      <MaterialPriceIndicator
                        workItemId={relatedWorkItem.id}
                        quantity={mat.quantity}
                        unit={mat.unit}
                        materialUnitPrice={relatedWorkItem.materialUnitPrice || undefined}
                        currentMarketPrice={relatedWorkItem.currentMarketPrice || null}
                        materialName={mat.name}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MaterialSlotsSection;
