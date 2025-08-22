"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  updateWorkDiaryItem,
  createWorkDiaryItem,
} from "@/actions/workdiary-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import type { WorkItem } from "@/types/work";
import type { WorkDiaryItemCreate, WorkDiaryItemUpdate } from "@/types/work-diary";

type ActionResult<T> = { success: boolean; data?: T };

interface WorkerDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  workItems: WorkItem[];
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

export default function WorkerDiaryEditForm({
  diary,
  workItems,
  onSave,
  onCancel,
}: WorkerDiaryEditFormProps) {
  const { user } = useUser();
  const currentEmail = useMemo(
    () =>
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "",
    [user]
  );
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | "">(
    typeof diary.workItemId === "number" ? diary.workItemId : ""
  );
  // Worker selection based on WorkItem.workItemWorkers
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | "">("");
  useEffect(() => {
    // Reset worker selection when work item changes
    setSelectedWorkerId("");
  }, [selectedWorkItemId]);
  // Format a date to YYYY-MM-DD in LOCAL time to avoid UTC shifts
  const formatLocalDate = (value?: Date | string) => {
    if (!value) return "";
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [date, setDate] = useState<string>(formatLocalDate(diary.date));
  const [description, setDescription] = useState(diary.description || "");
  const [quantity, setQuantity] = useState<number | "">(
    typeof diary.quantity === "number" ? diary.quantity : ""
  );
  const [unit, setUnit] = useState<string>(diary.unit || "");
  const [workHours, setWorkHours] = useState<number | "">(
    typeof diary.workHours === "number" ? diary.workHours : ""
  );
  const [images, setImages] = useState<string[]>(diary.images || []);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Derived: selected WorkItem and its assigned workers
  const selectedItem =
    selectedWorkItemId === ""
      ? undefined
      : workItems.find((wi) => wi.id === Number(selectedWorkItemId));
  const assignedWorkers = selectedItem?.workItemWorkers ?? [];
  const workersById = useMemo(() => {
    const map = new Map<number, { email?: string; name?: string | null }>();
    (selectedItem?.workers ?? []).forEach((w) =>
      map.set(w.id, { email: w.email, name: w.name })
    );
    return map;
  }, [selectedItem]);

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

  const handleSubmit = (e: React.FormEvent) => {
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

    const selectedEmail = (
      workersById.get(Number(selectedWorkerId))?.email ??
      assignedWorkers.find((aw) => aw.workerId === Number(selectedWorkerId))?.email
    ) || undefined;

    const payload: WorkDiaryItemCreate = {
      diaryId: diary.id!,
      workId: diary.workId,
      workItemId: Number(selectedWorkItemId), // always number for create
      workerId: Number(selectedWorkerId),
      email: selectedEmail,
      date: toLocalDate(date),
      quantity: quantity === "" ? undefined : Number(quantity),
      unit: unit || undefined,
      workHours: workHours === "" ? undefined : Number(workHours),
      images,
      notes: description,
    };
    if (diary.id !== undefined) {
      // Update
      const updatePayload: WorkDiaryItemUpdate = {
        ...payload,
        id: diary.id,
      };
      updateWorkDiaryItem(updatePayload).then(
        (result: ActionResult<Partial<WorkDiaryWithItem>>) => {
          if (result.success && result.data) {
            onSave(result.data);
          } else {
            // handle error (optional)
          }
        }
      );
    } else {
      // Create
      createWorkDiaryItem(payload).then(
        (result: ActionResult<Partial<WorkDiaryWithItem>>) => {
          if (result.success && result.data) {
            onSave(result.data);
          } else {
            // handle error (optional)
          }
        }
      );
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
            const email = workersById.get(w.workerId)?.email || w.email || undefined;
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
    </form>
  );
}
