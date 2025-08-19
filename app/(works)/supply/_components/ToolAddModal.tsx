"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WorkItem } from "@/types/work";

interface ToolAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; quantity: number; workItemId: number }) => void;
  workItems: WorkItem[];
}

const ToolAddModal: React.FC<ToolAddModalProps> = ({ open, onOpenChange, onSubmit, workItems }) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [workItemId, setWorkItemId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !workItemId) return;
    setLoading(true);
    await onSubmit({ name, quantity: Number(quantity), workItemId: Number(workItemId) });
    setLoading(false);
    setName("");
    setQuantity("");
    setWorkItemId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új eszköz hozzáadása</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Eszköz neve</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Munkafázis</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={workItemId}
              onChange={e => setWorkItemId(Number(e.target.value))}
              required
            >
              <option value="">Válassz munkafázist…</option>
              {workItems.map(wi => (
                <option key={wi.id} value={wi.id}>{wi.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Mennyiség</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>Hozzáadás</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Mégse</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ToolAddModal;
