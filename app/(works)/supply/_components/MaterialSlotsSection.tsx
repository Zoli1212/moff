"use client";
import React, { useState } from "react";
import type { Material } from "@/types/work";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import MaterialAddModal from "./MaterialAddModal";
import { addMaterial } from "@/actions/materials-action";

import type { WorkItem } from "@/types/work";
export interface MaterialSlotsSectionProps {
  materials: Material[];
  workId: number;
  workItems: WorkItem[];
}

const MaterialSlotsSection: React.FC<MaterialSlotsSectionProps> = ({ materials, workId, workItems }) => {
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

  // Állapot a modal nyitásához (később implementáljuk)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Material hozzáadás submit handler (később implementáljuk az actions-t)

const handleAddMaterial = async (data: { name: string; quantity: number; unit: string; unitPrice: number; workItemId: number }) => {
    try {
      await addMaterial({ ...data, workId });
      toast.success("Anyag sikeresen hozzáadva!");
      // TODO: Frissítsd a material listát vagy triggerelj újra lekérdezést
      // Például: router.refresh() vagy state frissítés
    } catch (err) {
      console.error("Anyag hozzáadása sikertelen:", err);
      toast.error("Hiba történt az anyag hozzáadásakor!");
    }
  };

  return (
    <>
      <MaterialAddModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddMaterial}
        workItems={workItems}
      />
      <div
        className="relative bg-white rounded-xl shadow-sm px-5 py-3 mb-5"
      >
      {/* Plusz gomb jobb felső sarokban */}
      <Button
        onClick={() => setIsAddModalOpen(true)}
        variant="outline"
        aria-label="Új anyag hozzáadása"
        className="absolute top-[14px] right-[18px] p-2 rounded-full border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
      >
        <Plus className="h-5 w-5" />
      </Button>
      {/* Hézag a plusz gomb alatt */}
      <div className="h-8" />
      <div className="font-bold text-[17px] mb-2 tracking-[0.5px]">Anyagok ({materials.length})</div>
      <div className="flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pb-20">
        {materials.length === 0 && (
          <span className="text-[#bbb]">Nincs anyag</span>
        )}
        {materials.map((mat) => (
          <div key={mat.id}>
            <div
              className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.includes(mat.id)}
                  onChange={() => handleToggle(mat.id)}
                  className="mr-2.5 w-[18px] h-[18px]"
                />
                <div className="flex-2 font-semibold">{mat.name}</div>
                <div className="flex-1 text-[#888] text-[14px]">
                  {typeof mat.quantity !== "undefined" && mat.quantity !== null ? (
                    <>
                      <span className="font-semibold">{mat.quantity}</span>
                      <span className="ml-1">{mat.unit || ""}</span>
                    </>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full min-w-[120px] max-w-[220px] ml-8 mt-2 mb-2">
              <div className="bg-[#e0e0e0] rounded-lg h-4 w-full overflow-hidden relative">
                <div
                  className="bg-[#4caf50] h-full rounded-lg transition-all duration-300"
                  style={{ width: getProgress(Number(mat.quantity)) + "%" }}
                />
                <span
                  className="absolute left-2 top-0 text-[12px] text-[#222] leading-4"
                >
                  {mat.quantity} {mat.unit}
                </span>
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
