"use client";
import React, { useState } from "react";
import type { Material } from "@/types/work";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import MaterialAddModal from "./MaterialAddModal";
import MaterialEditModal from "./MaterialEditModal";
import {
  addMaterial,
  updateMaterial,
  deleteMaterial,
  setMaterialAvailableFull,
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
  const [materials, setMaterials] = useState<Material[]>(filteredMaterials); // csak in-progress workItem-hez tartozó anyagok
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
        // Set availableQuantity to quantity and availableFull to true
        const updated = await setMaterialAvailableFull(id);
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
        );
        setSelected((prev) => [...prev, id]);
        toast.success("Anyag elérhetőként beállítva!");
      } else {
        // Unchecking logic: reset availableQuantity and availableFull
        const updated = await updateMaterial({
          id,
          availableQuantity: 0,
          availableFull: false,
        });
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
        );
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
                className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1 cursor-pointer hover:bg-[#ececec]"
                onClick={() => setEditMaterial(mat)}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(mat.id)}
                    disabled={loadingIds.includes(mat.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle(mat.id);
                    }}
                    className="mr-2.5 w-[18px] h-[18px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-2 font-semibold">{mat.name}</div>
                  <div className="ml-auto font-bold text-[16px] text-[#222] flex flex-col items-end">
                    {typeof mat.quantity !== "undefined" &&
                    mat.quantity !== null ? (
                      <span className="text-lg font-bold text-[#222]">
                        {mat.availableQuantity ?? 0}/{mat.quantity} {mat.unit}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
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
                        width: `${getProgress(mat.availableQuantity ?? 0, mat.quantity)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MaterialSlotsSection;
