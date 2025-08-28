"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  updateWorkDiaryItem,
  createWorkDiaryItem,
  getOrCreateWorkDiaryForTask,
} from "@/actions/workdiary-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateWorkItemCompletion } from "@/actions/work-actions";

import type { WorkItem, WorkItemWorker } from "@/types/work";
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
  // Keep select value as string token to avoid collisions and preserve exact choice
  // Token format: 'aw:<assignmentId>' for assigned worker entries, 'w:<workerId>' for plain workers
  const [selectedWorkerToken, setSelectedWorkerToken] = useState<string | "">(
    ""
  );
  useEffect(() => {
    // Reset worker selection when work item changes
    if (!editingItem?.workerId) {
      setSelectedWorkerToken("");
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
  // Completion modal state (quantity-based)
  const [progressOpen, setProgressOpen] = useState(false);
  const [completedQtyValue, setCompletedQtyValue] = useState<number>(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const initialAutoSelectDone = useRef(false);
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

  // Helpers to parse selection token (must be declared before effects that use it)
  const parseToken = useMemo(() => {
    return (token: string | "") => {
      if (!token)
        return {
          source: "",
          workerId: undefined as number | undefined,
          assignedId: undefined as number | undefined,
        };
      if (token.startsWith("aw:")) {
        const assignedId = Number(token.slice(3));
        const assigned = assignedWorkers.find((a) => a.id === assignedId);
        return {
          source: "aw" as const,
          workerId: assigned?.workerId,
          assignedId,
        };
      }
      if (token.startsWith("w:")) {
        const workerId = Number(token.slice(2));
        return { source: "w" as const, workerId, assignedId: undefined };
      }
      // fallback: legacy numeric
      const workerId = Number(token);
      const assigned = assignedWorkers.find((a) => a.workerId === workerId);
      return assigned
        ? { source: "aw" as const, workerId, assignedId: assigned.id }
        : { source: "w" as const, workerId, assignedId: undefined };
    };
  }, [assignedWorkers]);

  // Build worker options for the dropdown: prefer assignments, otherwise fallback to plain workers
  const workerOptions = useMemo(() => {
    if (assignedWorkers.length > 0) {
      return assignedWorkers.map((w: WorkItemWorker) => ({
        key: w.id,
        token: `aw:${w.id}`,
        workerId: w.workerId,
        name: w.name ?? workersById.get(w.workerId)?.name ?? `#${w.workerId}`,
        role: (w.role ?? undefined) as string | undefined,
        email: w.email ?? workersById.get(w.workerId)?.email,
      }));
    }
    // Fallback to workers when there are no explicit assignments
    return (selectedItem?.workers ?? []).map((w) => ({
      key: w.id,
      token: `w:${w.id}`,
      workerId: w.id,
      name: w.name ?? `#${w.id}`,
      role: w.role ?? undefined,
      email: w.email,
    }));
  }, [assignedWorkers, selectedItem, workersById]);

  // DEBUG: dump incoming props and derived state
  useEffect(() => {
    try {
      console.log("[WorkerDiaryEditForm][DEBUG] props/state", {
        diary,
        editingItem,
        workItemsCount: workItems?.length ?? 0,
        workItems,
        selectedWorkItemId,
        selectedItem,
        assignedWorkers,
        workerOptions,
        selectedWorkerToken,
      });
      if (editingItem?.id && !selectedWorkerToken) {
        const token = editingItem.workItemWorkerId
          ? `aw:${editingItem.workItemWorkerId}`
          : editingItem.workerId
            ? `w:${editingItem.workerId}`
            : "";
        console.log("[WorkerDiaryEditForm][DEBUG] computed token from editingItem", token);
      }
    } catch {}
  }, [
    diary,
    editingItem,
    workItems,
    selectedWorkItemId,
    selectedItem,
    assignedWorkers,
    workerOptions,
    selectedWorkerToken,
  ]);

  // Extend options with a synthetic one from editingItem when missing (so select can display it)
  const displayWorkerOptions = useMemo(() => {
    if (!editingItem?.id) return workerOptions;
    const token = (editingItem as any).workItemWorkerId
      ? `aw:${(editingItem as any).workItemWorkerId}`
      : editingItem.workerId
        ? `w:${editingItem.workerId}`
        : "";
    if (!token) return workerOptions;
    if (workerOptions.some(o => o.token === token)) return workerOptions;
    return [
      {
        key: -1,
        token,
        workerId: (editingItem.workerId as number | undefined) ?? -1,
        name: (editingItem as any).name || `#${editingItem.workerId ?? ""}`,
        role: undefined,
        email: (editingItem as any).email || undefined,
      },
      ...workerOptions,
    ];
  }, [editingItem, workerOptions]);

  // Ensure prefill for both work item and worker in edit mode
  useEffect(() => {
    if (!editingItem?.id) return;
    // Prefill work item if not yet selected
    if (selectedWorkItemId === "" && editingItem.workItemId) {
      setSelectedWorkItemId(editingItem.workItemId);
    }
    // Prefill worker token if not yet selected
    if (!selectedWorkerToken) {
      const token = (editingItem as any).workItemWorkerId
        ? `aw:${(editingItem as any).workItemWorkerId}`
        : editingItem.workerId
          ? `w:${editingItem.workerId}`
          : "";
      if (token) setSelectedWorkerToken(token);
    }
  }, [editingItem, selectedWorkItemId, selectedWorkerToken]);

  // Instant log whenever selection changes (debug)
  useEffect(() => {
    if (selectedWorkerToken === "") return;
    try {
      const sel = parseToken(selectedWorkerToken);
      const opt = displayWorkerOptions.find((o) => o.token === selectedWorkerToken);
      const assigned = sel.assignedId
        ? assignedWorkers.find((aw) => aw.id === sel.assignedId)
        : undefined;
      const name =
        opt?.name ??
        assigned?.name ??
        (sel.workerId ? workersById.get(sel.workerId)?.name : undefined);
      const email =
        opt?.email ??
        (sel.workerId ? workersById.get(sel.workerId)?.email : undefined) ??
        assigned?.email;
      console.log("[WorkerDiaryEditForm] selected worker changed:", {
        selectedWorkerToken,
        parsed: sel,
        opt,
        assigned,
        name,
        email,
      });
    } catch {}
  }, [
    selectedWorkerToken,
    workerOptions,
    assignedWorkers,
    workersById,
    parseToken,
  ]);

  //

  // Auto-select by current user's email if there's a matching worker assigned to the selected item
  useEffect(() => {
    if (initialAutoSelectDone.current) return;
    if (!currentEmail || !selectedItem || assignedWorkers.length === 0) return;
    if (selectedWorkerToken !== "") return; // do not override manual choice
    const matchWorker = (selectedItem.workers ?? []).find(
      (w) => (w.email || "").toLowerCase() === currentEmail.toLowerCase()
    );
    if (!matchWorker) return;
    const assigned = assignedWorkers.find(
      (aw) => aw.workerId === matchWorker.id
    );
    if (assigned) {
      setSelectedWorkerToken(`aw:${assigned.id}`);
      initialAutoSelectDone.current = true;
    }
  }, [currentEmail, selectedItem, assignedWorkers, selectedWorkerToken]);

  // Auto-select for fallback worker list (no assignments), based on current user's email
  useEffect(() => {
    if (initialAutoSelectDone.current) return;
    if (!currentEmail || !selectedItem) return;
    if (assignedWorkers.length > 0) return; // handled above
    if (selectedWorkerToken !== "") return;
    const matchWorker = (selectedItem.workers ?? []).find(
      (w) => (w.email || "").toLowerCase() === currentEmail.toLowerCase()
    );
    if (matchWorker) {
      setSelectedWorkerToken(`w:${matchWorker.id}`);
      initialAutoSelectDone.current = true;
    }
  }, [currentEmail, selectedItem, assignedWorkers.length, selectedWorkerToken]);

  // Keep inline progress slider in sync with the selected WorkItem's saved completion
  useEffect(() => {
    const maxQty = Number(selectedItem?.quantity || 0);
    const baseCompleted = Number(
      typeof selectedItem?.completedQuantity === "number"
        ? selectedItem?.completedQuantity
        : 0
    );
    const initial = Math.max(0, Math.min(maxQty, baseCompleted));
    setCompletedQtyValue(initial);
  }, [selectedItem?.completedQuantity, selectedItem?.quantity]);

  // (parseToken defined above)

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
    if (selectedWorkerToken === "") return;
    // Convert YYYY-MM-DD to a Date in LOCAL time (year, monthIndex, day)
    const toLocalDate = (ymd: string): Date | undefined => {
      if (!ymd) return undefined;
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };

    // Prefer name/email coming from the exact option the user selected in the dropdown
    const selectedOpt = displayWorkerOptions.find(
      (o) => o.token === selectedWorkerToken
    );
    const sel = parseToken(selectedWorkerToken);
    const selectedEmail =
      selectedOpt?.email ||
      (sel.workerId ? workersById.get(sel.workerId)?.email : undefined) ||
      (sel.assignedId
        ? assignedWorkers.find((aw) => aw.id === sel.assignedId)?.email
        : undefined) ||
      undefined;

    // derive name and workItemWorkerId from the selected assignment (no UI change)
    const selectedAssignment = sel.assignedId
      ? assignedWorkers.find((aw) => aw.id === sel.assignedId)
      : undefined;
    // Prefer the name coming from the selected assignment (dropdown),
    // but fall back to the worker entity's name if the assignment lacks it
    const selectedName =
      selectedOpt?.name ||
      selectedAssignment?.name ||
      (sel.workerId ? workersById.get(sel.workerId)?.name : undefined) ||
      undefined;

    // Require both name and email to be present for saving
    if (!selectedName || !selectedEmail) {
      showToast(
        "error",
        !selectedName && !selectedEmail
          ? "Hiányzik a dolgozó neve és email címe."
          : !selectedName
            ? "Hiányzik a dolgozó neve."
            : "Hiányzik a dolgozó email címe."
      );
      return;
    }
    const selectedWorkItemWorkerId = selectedAssignment?.id;

    // Prepare base fields
    const base = {
      diaryId: diary.id!,
      workId: diary.workId,
      workItemId: Number(selectedWorkItemId),
      workerId: Number(sel.workerId),
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

    // Option A: save WorkItem completion first (if applicable), then save diary
    try {
      if (
        isTenant &&
        selectedItem &&
        Number.isFinite(completedQtyValue) &&
        Number(completedQtyValue) !== Number((selectedItem as any).completedQuantity ?? -1)
      ) {
        const res = (await updateWorkItemCompletion({
          workItemId: Number(selectedWorkItemId),
          completedQuantity: Number(completedQtyValue) || 0,
        })) as unknown as { success?: boolean; message?: string };
        if (!res?.success) {
          showToast("error", res?.message || "Készültség mentése sikertelen.");
          return;
        }
      }
    } catch {}

    if (editingItem?.id) {
      // Update existing WorkDiaryItem
      const updatePayload: WorkDiaryItemUpdate = {
        id: editingItem.id,
        ...base,
      };
      try {
        console.log("[WorkerDiaryEditForm] update selected:", {
          selectedWorkItemId,
          workerId: sel.workerId,
          selectedOpt,
          selectedAssignment,
          selectedEmail,
          selectedName,
        });
        console.log("[WorkerDiaryEditForm] update payload:", updatePayload);
      } catch {}
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
        const res: ActionResult<{ id: number }> =
          await getOrCreateWorkDiaryForTask({
            workId: diary.workId,
            workItemId: Number(selectedWorkItemId),
          });
        if (!res?.success || !res?.data?.id) {
          showToast(
            "error",
            res?.message || "Napló azonosító megszerzése sikertelen."
          );
          return;
        }
        diaryIdToUse = res.data.id as number;
      }

      const createPayload: WorkDiaryItemCreate = {
        ...base,
        diaryId: diaryIdToUse,
      };
      try {
        console.log("[WorkerDiaryEditForm] create selected:", {
          selectedWorkItemId,
          workerId: sel.workerId,
          selectedOpt,
          selectedAssignment,
          selectedEmail,
          selectedName,
        });
        console.log("[WorkerDiaryEditForm] create payload:", createPayload);
      } catch {}
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
    <form
      className="space-y-6 max-w-4xl mx-auto max-h-[100dvh] overflow-y-auto p-4"
      onSubmit={handleSubmit}
    >
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
          value={selectedWorkerToken}
          onChange={(e) => {
            const token = e.target.value;
            setSelectedWorkerToken(token);
            try {
              const sel = parseToken(token);
              const opt = displayWorkerOptions.find((o) => o.token === token);
              const assigned = sel.assignedId
                ? assignedWorkers.find((aw) => aw.id === sel.assignedId)
                : undefined;
              const name =
                opt?.name ??
                assigned?.name ??
                (sel.workerId
                  ? workersById.get(sel.workerId)?.name
                  : undefined);
              const email =
                opt?.email ??
                (sel.workerId
                  ? workersById.get(sel.workerId)?.email
                  : undefined) ??
                assigned?.email;
              console.log("[WorkerDiaryEditForm] select change:", {
                selectedWorkerToken: token,
                parsed: sel,
                opt,
                assigned,
                name,
                email,
              });
            } catch {}
          }}
          disabled={selectedWorkItemId === ""}
          required
        >
          <option value="">Válassz dolgozót…</option>
          {displayWorkerOptions.map((w) => (
            <option key={w.key} value={w.token}>
              {w.name} {w.role ? `(${w.role})` : ""}
              {w.email ? ` - ${w.email}` : ""}
            </option>
          ))}
        </select>
        {selectedWorkItemId !== "" &&
          assignedWorkers.length === 0 &&
          (selectedItem?.workers ?? []).length === 0 && (
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
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="accepted-checkbox"
              type="checkbox"
              className="h-4 w-4"
              checked={!!accepted}
              onChange={(e) => {
                const checked = e.target.checked;
                setAccepted(checked);
                if (checked) {
                  // Initialize inline completion controls
                  const baseCompleted = Number(
                    typeof selectedItem?.completedQuantity === "number"
                      ? selectedItem?.completedQuantity
                      : 0
                  );
                  const maxQty = Number(selectedItem?.quantity || 0);
                  const initial = Math.max(0, Math.min(maxQty, baseCompleted));
                  setCompletedQtyValue(initial);
                }
              }}
            />
            <Label htmlFor="accepted-checkbox">Elfogadva</Label>
          </div>

          {
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="completed-inline">Elkészült mennyiség</Label>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {`${(Number.isFinite(completedQtyValue) ? completedQtyValue : 0).toFixed(2)} / ${Number(selectedItem?.quantity || 0)} ${selectedItem?.unit || ""}`}
                  </div>
                  <div className="text-muted-foreground">
                    {selectedItem?.quantity
                      ? Math.floor(
                          ((completedQtyValue || 0) /
                            (selectedItem.quantity || 1)) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
              <input
                id="completed-inline"
                type="range"
                min={0}
                max={Number(selectedItem?.quantity || 0)}
                step={0.01}
                value={Number.isFinite(completedQtyValue) ? completedQtyValue : 0}
                onChange={(e) => setCompletedQtyValue(Number(e.target.value))}
                className="w-full"
                disabled={!selectedItem}
              />
              <div className="text-xs text-muted-foreground text-right">A készültség a fő Mentés gombbal kerül mentésre.</div>
            </div>
          }
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
            selectedWorkerToken === ""
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
      {/* Completion Dialog (quantity-based) */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Munkafolyamat készültség</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="completed-range">Elkészült mennyiség</Label>
              <div className="text-right text-sm">
                <div className="font-medium">
                  {`${(Number.isFinite(completedQtyValue) ? completedQtyValue : 0).toFixed(2)} / ${Number(selectedItem?.quantity || 0)} ${selectedItem?.unit || ""}`}
                </div>
                <div className="text-muted-foreground">
                  {selectedItem?.quantity
                    ? Math.floor(
                        ((completedQtyValue || 0) /
                          (selectedItem.quantity || 1)) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
            <input
              id="completed-range"
              type="range"
              min={0}
              max={Number(selectedItem?.quantity || 0)}
              step={0.01}
              value={Number.isFinite(completedQtyValue) ? completedQtyValue : 0}
              onChange={(e) => setCompletedQtyValue(Number(e.target.value))}
              className="w-full"
              disabled={!selectedItem}
            />
            <div className="text-xs text-muted-foreground">
              {`Elkészült: ${completedQtyValue.toFixed(2)} / ${Number(selectedItem?.quantity || 0)} ${selectedItem?.unit || ""}`}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProgressOpen(false)}
            >
              Mégsem
            </Button>
            <Button
              type="button"
              disabled={selectedWorkItemId === ""}
              onClick={async () => {
                if (selectedWorkItemId === "") return;
                type SimpleResult = { success?: boolean; message?: string };
                const result = (await updateWorkItemCompletion({
                  workItemId: Number(selectedWorkItemId),
                  completedQuantity: Number(completedQtyValue) || 0,
                })) as unknown as SimpleResult;
                if (result?.success) {
                  showToast("success", "Készültség mentve.");
                  // If we are editing an existing diary item and the tenant checked acceptance,
                  // persist accepted=true immediately so it's not lost if the user doesn't submit the main form.
                  try {
                    if (isTenant && accepted && editingItem?.id) {
                      const acceptPayload: WorkDiaryItemUpdate = {
                        id: editingItem.id,
                        workId: diary.workId,
                        workItemId: Number(selectedWorkItemId),
                        accepted: true,
                      };
                      await updateWorkDiaryItem(acceptPayload);
                    }
                  } catch {}
                  setProgressOpen(false);
                } else {
                  showToast(
                    "error",
                    result?.message || "Készültség mentése sikertelen."
                  );
                }
              }}
            >
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
