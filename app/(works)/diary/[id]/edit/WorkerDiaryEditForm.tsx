"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  updateWorkDiaryItem,
  createWorkDiaryItem,
  createWorkDiary,
} from "@/actions/workdiary-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import type { WorkItem } from "@/types/work";
import type {
  WorkDiaryItemCreate,
  WorkDiaryItemUpdate,
} from "@/types/work-diary";

type ActionResult<T> = { success: boolean; data?: T; message?: string };

interface WorkerDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  workItems: WorkItem[];
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
  // Optional: when provided, the form acts in "edit" mode for this WorkDiaryItem
  editingItem?: Partial<WorkDiaryItemUpdate> & { id: number };
}

export default function WorkerDiaryEditForm({
  diary,
  workItems,
  onSave,
  onCancel,
  editingItem,
}: WorkerDiaryEditFormProps) {
  const { user } = useUser();
  const currentEmail = useMemo(
    () =>
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "",
    [user]
  );
  const isTenant = useMemo(() => {
    const a = (currentEmail || "").toLowerCase();
    const b = (diary?.tenantEmail || "").toLowerCase();
    return !!a && !!b && a === b;
  }, [currentEmail, diary?.tenantEmail]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | "">(
    typeof (editingItem?.workItemId ?? diary.workItemId) === "number"
      ? ((editingItem?.workItemId as number) ?? diary.workItemId)
      : ""
  );
  // Worker selection based on WorkItem.workItemWorkers
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | "">(
    typeof editingItem?.workerId === "number"
      ? (editingItem?.workerId as number)
      : ""
  );
  useEffect(() => {
    // Reset worker selection when work item changes
    if (!editingItem?.workerId) {
      setSelectedWorkerId("");
    }
  }, [selectedWorkItemId, editingItem?.workerId]);
  // Format a date to YYYY-MM-DD in LOCAL time to avoid UTC shifts
  const formatLocalDate = (value?: Date | string) => {
    if (!value) return "";
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [date, setDate] = useState<string>(
    formatLocalDate(editingItem?.date ?? diary.date)
  );
  const [description, setDescription] = useState(
    (editingItem?.notes as string | undefined) ?? diary.description ?? ""
  );
  const [quantity, setQuantity] = useState<number | "">(
    typeof editingItem?.quantity === "number"
      ? (editingItem?.quantity as number)
      : typeof diary.quantity === "number"
        ? diary.quantity
        : ""
  );
  const [unit, setUnit] = useState<string>(
    (editingItem?.unit as string | undefined) ?? diary.unit ?? ""
  );
  const [workHours, setWorkHours] = useState<number | "">(
    typeof editingItem?.workHours === "number"
      ? (editingItem?.workHours as number)
      : typeof diary.workHours === "number"
        ? diary.workHours
        : ""
  );
  const [images, setImages] = useState<string[]>(
    (editingItem?.images as string[] | undefined) ?? diary.images ?? []
  );
  const [accepted, setAccepted] = useState<boolean>(
    editingItem?.accepted ?? false
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  // simple toast state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Derived: selected WorkItem and its assigned workers
  const selectedItem =
    selectedWorkItemId === ""
      ? undefined
      : workItems.find((wi) => wi.id === Number(selectedWorkItemId));
  const assignedWorkers = useMemo(
    () => selectedItem?.workItemWorkers ?? [],
    [selectedItem]
  );
  const workersById = useMemo(() => {
    const map = new Map<number, { email?: string; name?: string | null }>();
    (selectedItem?.workers ?? []).forEach((w) =>
      map.set(w.id, { email: w.email, name: w.name })
    );
    return map;
  }, [selectedItem]);

  // DEBUG: Log data relevant to the worker dropdown (no logic change)
  useEffect(() => {
    try {
      console.log("[WorkerDiaryEditForm] dropdown sources", {
        selectedWorkItemId,
        selectedItemId: selectedItem?.id,
        workers: selectedItem?.workers,
        workItemWorkers: selectedItem?.workItemWorkers,
        workersById: Array.from((workersById ?? new Map()).entries()),
      });
    } catch {}
  }, [selectedWorkItemId, selectedItem, workersById]);

  // Auto-select by current user's email if there's a matching worker assigned to the selected item
  useEffect(() => {
    if (!currentEmail || !selectedItem || assignedWorkers.length === 0) return;
    if (selectedWorkerId !== "") return; // do not override manual choice
    const matchWorker = (selectedItem.workers ?? []).find(
      (w) => (w.email || "").toLowerCase() === currentEmail.toLowerCase()
    );
    if (!matchWorker) return;
    const assigned = assignedWorkers.find(
      (aw) => aw.workerId === matchWorker.id
    );
    if (assigned) {
      setSelectedWorkerId(assigned.workerId);
    }
  }, [currentEmail, selectedItem, assignedWorkers, selectedWorkerId]);

  // Handle image upload (adapted from ToolRegisterModal)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    setImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setImageError(data.error || "Hiba történt a feltöltésnél.");
      }
    } catch (err) {
      setImageError("Hiba a feltöltés során: " + (err as Error).message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    // Use strict types for payloads
    if (selectedWorkItemId === "" || isNaN(Number(selectedWorkItemId))) return; // Don't submit if not selected
    // Worker is mandatory
    if (selectedWorkerId === "" || isNaN(Number(selectedWorkerId))) return;
    // Convert YYYY-MM-DD to a Date in LOCAL time (year, monthIndex, day)
    const toLocalDate = (ymd: string): Date | undefined => {
      if (!ymd) return undefined;
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };

    const selectedEmail =
      (workersById.get(Number(selectedWorkerId))?.email ??
        assignedWorkers.find((aw) => aw.workerId === Number(selectedWorkerId))
          ?.email) ||
      undefined;

    // derive name and workItemWorkerId from the selected assignment (no UI change)
    const selectedAssignment = assignedWorkers.find(
      (aw) => aw.workerId === Number(selectedWorkerId)
    );
    const selectedName = selectedAssignment?.name;
    const selectedWorkItemWorkerId = selectedAssignment?.id;

    // Prepare base fields
    const base = {
      diaryId: diary.id!,
      workId: diary.workId,
      workItemId: Number(selectedWorkItemId),
      workerId: Number(selectedWorkerId),
      email: selectedEmail,
      name: selectedName ?? undefined,
      workItemWorkerId: selectedWorkItemWorkerId,
      date: toLocalDate(date),
      quantity: quantity === "" ? undefined : Number(quantity),
      unit: unit || undefined,
      workHours: workHours === "" ? undefined : Number(workHours),
      images,
      notes: description,
      accepted: isTenant ? accepted : undefined,
    } as const;

    try {
      console.log("[WorkerDiaryEditForm] submit", {
        isTenant,
        accepted,
        base,
      });
    } catch {}

    if (editingItem?.id) {
      // Update existing WorkDiaryItem
      const updatePayload: WorkDiaryItemUpdate = {
        id: editingItem.id,
        ...base,
      };
      const result: ActionResult<Partial<WorkDiaryWithItem>> =
        await updateWorkDiaryItem(updatePayload);
      if (result.success && result.data) {
        showToast("success", "Napló bejegyzés frissítve.");
        onSave(result.data);
      } else {
        showToast("error", result.message || "Sikertelen mentés.");
      }
    } else {
      // Create new WorkDiaryItem
      // Ensure there is a real WorkDiary.id (DiaryPageClient may pass id: 0 for a new day)
      let diaryIdToUse = diary.id;
      if (!diaryIdToUse || diaryIdToUse === 0) {
        const created: ActionResult<{ id: number }> = await createWorkDiary({
          workId: diary.workId,
          workItemId: Number(selectedWorkItemId),
        });
        if (!created?.success || !created?.data?.id) {
          showToast(
            "error",
            created?.message || "Napló létrehozása sikertelen."
          );
          return;
        }
        diaryIdToUse = created.data.id as number;
      }

      const createPayload: WorkDiaryItemCreate = {
        ...base,
        diaryId: diaryIdToUse,
      };
      const result: ActionResult<Partial<WorkDiaryWithItem>> =
        await createWorkDiaryItem(createPayload);
      if (result.success && result.data) {
        showToast("success", "Napló bejegyzés mentve.");
        onSave(result.data);
      } else {
        showToast("error", result.message || "Sikertelen mentés.");
      }
    }
  };

  return (
    <form className="space-y-6 max-w-4xl mx-auto" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="work-item-select">Munkafolyamat</Label>
        <select
          id="work-item-select"
          className="w-full border rounded px-3 py-2 mt-1 mb-4"
          value={selectedWorkItemId}
          onChange={(e) =>
            setSelectedWorkItemId(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          required
        >
          <option value="">Válassz munkafolyamatot…</option>
          {workItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="worker-select">Dolgozó</Label>
        <select
          id="worker-select"
          className="w-full border rounded px-3 py-2 mt-1 mb-4"
          value={selectedWorkerId}
          onChange={(e) =>
            setSelectedWorkerId(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          disabled={selectedWorkItemId === "" || assignedWorkers.length === 0}
          required
        >
          <option value="">Válassz dolgozót…</option>
          {assignedWorkers.map((w) => {
            // DEBUG: per-option log (no logic change)
            try {
              console.log("[WorkerDiaryEditForm] option", {
                workItemWorker: w,
                workerId: w.workerId,
                mapEntry: workersById.get(w.workerId),
              });
            } catch {}
            const email =
              workersById.get(w.workerId)?.email || w.email || undefined;
            return (
              <option key={w.id} value={w.workerId}>
                {w.name ?? `#${w.workerId}`} {w.role ? `(${w.role})` : ""}
                {email ? ` - ${email}` : ""}
              </option>
            );
          })}
        </select>
        {selectedWorkItemId !== "" && assignedWorkers.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Ehhez a munkafolyamathoz nincs dolgozó rendelve.
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="diary-date">
          Dátum <Calendar className="inline ml-1 h-4 w-4" />
        </Label>
        <Input
          id="diary-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="diary-description">Leírás</Label>
        <Textarea
          id="diary-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />
      </div>
      <div>
        <Label htmlFor="diary-work-hours">Munkaóra</Label>
        <Input
          id="diary-work-hours"
          type="number"
          value={workHours}
          onChange={(e) =>
            setWorkHours(e.target.value === "" ? "" : Number(e.target.value))
          }
          min={0}
          step={0.1}
        />
      </div>
      <div>
        <Label>Mennyiség</Label>
        <Input
          type="number"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value === "" ? "" : Number(e.target.value))
          }
          min={0}
          step={0.01}
        />
      </div>
      <div>
        <Label htmlFor="diary-unit">Mennyiségi egység</Label>
        <Input
          id="diary-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="pl. m², fm, db"
        />
      </div>
      <div>
        <Label>Képek feltöltése</Label>
        <div className="flex flex-wrap gap-3 items-center">
          {images.map((img, idx) => (
            <div key={img} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`napló kép ${idx + 1}`}
                className="w-20 h-20 object-cover rounded shadow"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(img)}
                className="absolute -top-2 -right-2 bg-white border border-destructive text-destructive rounded-full w-6 h-6 flex items-center justify-center opacity-70 group-hover:opacity-100"
                title="Kép törlése"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-muted-foreground/10 transition">
            <span className="text-xs text-muted-foreground">
              Kép hozzáadása
            </span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={imageUploading}
            />
          </label>
        </div>
        {imageUploading && (
          <div className="text-blue-600 text-xs mt-1">Feltöltés...</div>
        )}
        {imageError && (
          <div className="text-red-600 text-xs mt-1">{imageError}</div>
        )}
      </div>
      {isTenant && (
        <div className="flex items-center gap-2 border-t pt-4">
          <input
            id="accepted-checkbox"
            type="checkbox"
            className="h-4 w-4"
            checked={!!accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <Label htmlFor="accepted-checkbox">Elfogadva</Label>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Mégsem
        </Button>
        <Button
          type="submit"
          disabled={
            !date ||
            imageUploading ||
            selectedWorkItemId === "" ||
            selectedWorkerId === ""
          }
        >
          Mentés
        </Button>
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 px-4 py-3 rounded shadow-lg text-sm ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </form>
  );
}
