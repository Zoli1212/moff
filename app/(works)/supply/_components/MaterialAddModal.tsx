"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { WorkItem } from "@/types/work";
interface MaterialAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; quantity: number; unit: string; unitPrice: number; workItemId: number }) => void;
  workItems: WorkItem[];
}

const MaterialAddModal: React.FC<MaterialAddModalProps> = ({ open, onOpenChange, onSubmit, workItems }) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [workItemId, setWorkItemId] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !unit || !unitPrice || !workItemId) return;
    setLoading(true);
    await onSubmit({ name, quantity: Number(quantity), unit, unitPrice: Number(unitPrice), workItemId: Number(workItemId) });
    setLoading(false);
    setName("");
    setQuantity("");
    setUnit("");
    setUnitPrice("");
    setWorkItemId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új anyag hozzáadása</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Anyag neve"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder="Mennyiség"
            value={quantity}
            onChange={e => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            className="border rounded px-3 py-2"
            required
            min={0}
            step={0.01}
          />
          <input
            type="text"
            placeholder="Mértékegység (pl. kg, db)"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder="Egységár (Ft)"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
            className="border rounded px-3 py-2 mt-2"
            required
            min={0}
            step={0.01}
          />
          <select
            value={workItemId}
            onChange={e => setWorkItemId(e.target.value ? Number(e.target.value) : "")}
            className="border rounded px-3 py-2 mt-2"
            required
          >
            <option value="">Válassz munkarészt...</option>
            {workItems.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <DialogFooter>
            <Button type="submit" disabled={loading || !name || !quantity || !unit}>
              {loading ? "Mentés..." : "Hozzáadás"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégsem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialAddModal;
