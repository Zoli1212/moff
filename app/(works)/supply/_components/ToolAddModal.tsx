"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-[90%] sm:max-w-md rounded-2xl overflow-hidden">
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
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[#FE9C00] hover:bg-[#FE9C00]/90 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? "Hozzáadás..." : "Hozzáadás"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Mégse
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ToolAddModal;
