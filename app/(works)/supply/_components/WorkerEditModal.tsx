"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface WorkerAssignment {
  id: number; // WorkItemWorker id
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null; // profession
  quantity?: number | null;
  avatarUrl?: string | null;
}

interface WorkerEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: WorkerAssignment | null;
  onSubmit: (data: { id: number; name?: string; email?: string; phone?: string; role?: string; quantity?: number; avatarUrl?: string | null }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const WorkerEditModal: React.FC<WorkerEditModalProps> = ({ open, onOpenChange, worker, onSubmit, onDelete }) => {
  const [name, setName] = useState(worker?.name ?? "");
  const [email, setEmail] = useState(worker?.email ?? "");
  const [phone, setPhone] = useState(worker?.phone ?? "");
  const [role, setRole] = useState(worker?.role ?? "");
  const [quantity, setQuantity] = useState<string>(
    typeof worker?.quantity === "number" ? String(worker?.quantity) : ""
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(worker?.name ?? "");
    setEmail(worker?.email ?? "");
    setPhone(worker?.phone ?? "");
    setRole(worker?.role ?? "");
    setQuantity(typeof worker?.quantity === "number" ? String(worker?.quantity) : "");
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    setLoading(true);
    await onSubmit({
      id: worker.id,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      role: role || undefined,
      quantity: quantity === "" ? undefined : Number(quantity),
      avatarUrl: worker.avatarUrl ?? null,
    });
    setLoading(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!worker) return;
    setLoading(true);
    await onDelete(worker.id);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Munkás hozzárendelés szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Név</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Szakma</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Létszám</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <DialogFooter className="flex flex-row justify-between mt-2 gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              Mentés
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              Törlés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerEditModal;
