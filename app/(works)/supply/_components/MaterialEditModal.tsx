"use client";
import React, { useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Material, WorkItem } from "@/types/work";

interface MaterialEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  workItems: WorkItem[];
  onSubmit: (data: {
    id: number;
    name: string;
    quantity: number;
    availableQuantity: number;
    unit: string;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const MaterialEditModal: React.FC<MaterialEditModalProps> = ({
  open,
  onOpenChange,
  material,
  onSubmit,
  onDelete,
}) => {
  const [name, setName] = useState(material?.name || "");
  const [quantity, setQuantity] = useState(
    material?.quantity?.toString() || ""
  );
  const [availableQuantity, setAvailableQuantity] = useState(
    material?.availableQuantity?.toString() || ""
  );
  const [unit, setUnit] = useState(material?.unit || "");
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  React.useEffect(() => {
    setName(material?.name || "");
    setQuantity(material?.quantity?.toString() || "");
    setAvailableQuantity(material?.availableQuantity?.toString() || "");
    setUnit(material?.unit || "");
  }, [material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !material) return;
    setLoading(true);
    await onSubmit({
      id: material.id,
      name,
      quantity: Number(quantity),
      availableQuantity: Number(availableQuantity),
      unit,
    });
    setLoading(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!material) return;
    setLoading(true);
    await onDelete(material.id);
    setLoading(false);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-[calc(100%-2rem)] w-96">
        <DialogHeader>
          <DialogTitle>Anyag szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Név</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mennyiség</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mennyiségi egység</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="pl. kg, db, m²"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Elérhető mennyiség
            </label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
              type="number"
              min={0}
              max={quantity}
              value={availableQuantity}
              onChange={(e) => setAvailableQuantity(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 mt-2">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#FF9900] hover:bg-[#FF9900]/90 text-white"
            >
              Mentés
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Törlés
            </Button>
          </DialogFooter>
        </form>
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Anyag törlése"
          description="Biztos, hogy törlöd ezt az anyagot? A művelet nem vonható vissza."
        />
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MaterialEditModal;
