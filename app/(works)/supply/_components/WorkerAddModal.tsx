"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WorkItem } from "@/types/work";

interface WorkerAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItems: WorkItem[];
  professions: string[];
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    profession: string;
    workItemId: number;
    avatarUrl?: string;
  }) => Promise<void> | void;
}

const WorkerAddModal: React.FC<WorkerAddModalProps> = ({ open, onOpenChange, workItems, professions, onSubmit }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [workItemId, setWorkItemId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !profession || !workItemId) return;
    setLoading(true);
    await onSubmit({
      name,
      email,
      phone,
      profession,
      workItemId: Number(workItemId),
    });
    setLoading(false);
    setName("");
    setEmail("");
    setPhone("");
    setProfession("");
    setWorkItemId("");
    onOpenChange(false);
  };

  const professionsForSelected = useMemo(() => {
    // Force user to pick a workItem first
    if (!workItemId) return [] as string[];

    // With a selected workItem: restrict strictly to that phase
    const selected = workItems.find(w => w.id === Number(workItemId)) as any;
    const fromWorkers = ((selected?.workers ?? []) as any[])
      .map(w => w?.role ?? w?.name)
      .filter((r: any): r is string => !!r && typeof r === 'string' && r.trim().length > 0);
    const fromAssignments = ((selected?.workItemWorkers ?? []) as any[])
      .map(w => w?.role)
      .filter((r: any): r is string => !!r && typeof r === 'string' && r.trim().length > 0);
    return Array.from(new Set([...fromWorkers, ...fromAssignments])).sort((a,b) => a.localeCompare(b, 'hu'));
  }, [workItemId, workItems]);

  // Keep profession consistent with the available options for the selected work item
  useEffect(() => {
    if (profession && !professionsForSelected.includes(profession)) {
      setProfession("");
    }
  }, [professionsForSelected, profession]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új munkás regisztrálása és hozzárendelése munkafázishoz</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Select work phase first to filter professions */}
          <select
            value={workItemId}
            onChange={(e) => setWorkItemId(e.target.value ? Number(e.target.value) : "")}
            className="border rounded px-3 py-2 mt-2"
            required
          >
            <option value="">Válassz munkafázist...</option>
            {workItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className="border rounded px-3 py-2"
            disabled={!!workItemId && professionsForSelected.length === 0}
            required
          >
            <option value="">Válassz szakmát...</option>
            {professionsForSelected.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Név"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="tel"
            placeholder="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          
          <DialogFooter>
            <Button type="submit" disabled={loading || !name || !email || !phone || !profession || !workItemId}>
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

export default WorkerAddModal;
