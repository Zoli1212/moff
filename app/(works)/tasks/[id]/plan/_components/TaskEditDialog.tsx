"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import { createWorkTask, updateWorkTask } from "@/actions/work-plan-actions";

export type TaskDraft =
  | { mode: "create"; workId: number; parentId: number | null }
  | { mode: "edit"; workId: number; task: WorkTaskDto };

interface WorkforceOption {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
}

/** Schedule dates are UTC midnight, so the date input value is the ISO date part. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Reads a date input back as UTC midnight, matching how generation stores dates. */
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

interface Props {
  draft: TaskDraft;
  workforce: WorkforceOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskEditDialog({
  draft,
  workforce,
  onClose,
  onSaved,
}: Props) {
  const existing = draft.mode === "edit" ? draft.task : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [trade, setTrade] = useState(existing?.trade ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState(existing?.status ?? "todo");
  const [progress, setProgress] = useState(existing?.progress ?? 0);
  const [startDate, setStartDate] = useState(
    toDateInput(existing?.startDate ?? null)
  );
  const [endDate, setEndDate] = useState(toDateInput(existing?.endDate ?? null));
  const [assignee, setAssignee] = useState(
    existing?.workforceRegistryId != null
      ? String(existing.workforceRegistryId)
      : ""
  );

  const [isPending, startTransition] = useTransition();

  const datesInvalid = Boolean(startDate && endDate && endDate < startDate);

  const save = () => {
    if (!title.trim()) {
      toast.error("A feladat neve kötelező.");
      return;
    }
    if (!trade.trim()) {
      toast.error("A szakma megadása kötelező.");
      return;
    }
    if (datesInvalid) {
      toast.error("A befejezés nem lehet korábban, mint a kezdés.");
      return;
    }

    const workforceRegistryId = assignee ? Number(assignee) : null;

    startTransition(async () => {
      const result =
        draft.mode === "create"
          ? await createWorkTask({
              workId: draft.workId,
              parentId: draft.parentId,
              title,
              trade,
              description,
              startDate: fromDateInput(startDate),
              endDate: fromDateInput(endDate),
              workforceRegistryId,
            })
          : await updateWorkTask(draft.task.id, {
              title,
              trade,
              description,
              status,
              progress,
              startDate: fromDateInput(startDate),
              endDate: fromDateInput(endDate),
              workforceRegistryId,
            });

      if (!result.success) {
        toast.error(result.error ?? "A mentés nem sikerült.");
        return;
      }

      toast.success(
        draft.mode === "create" ? "Feladat létrehozva." : "Feladat mentve."
      );
      onSaved();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {draft.mode === "create"
              ? draft.parentId
                ? "Új alfeladat"
                : "Új feladat"
              : "Feladat szerkesztése"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Megnevezés">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="pl. Aljzatbetonozás"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Szakma">
            <input
              value={trade}
              onChange={(event) => setTrade(event.target.value)}
              placeholder="pl. kőműves"
              className={inputClass}
            />
          </Field>

          <Field label="Leírás">
            <textarea
              value={description ?? ""}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kezdés">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Befejezés">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={`${inputClass} ${
                  datesInvalid ? "border-red-400" : ""
                }`}
              />
            </Field>
          </div>

          {datesInvalid && (
            <p className="text-xs text-red-600">
              A befejezés korábbi, mint a kezdés.
            </p>
          )}

          <Field label="Felelős">
            <select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              className={inputClass}
            >
              <option value="">Nincs kijelölve</option>
              {workforce.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.role})
                </option>
              ))}
            </select>
          </Field>

          {draft.mode === "edit" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Státusz">
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as typeof status)
                  }
                  className={inputClass}
                >
                  {TASK_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {TASK_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Haladás (${progress}%)`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="w-full accent-[#FE9C00]"
                />
              </Field>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:w-auto"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || datesInvalid}
            className="w-full rounded-md bg-[#FE9C00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FE9C00]/90 disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Mentés…" : "Mentés"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#FE9C00] focus:outline-none focus:ring-1 focus:ring-[#FE9C00]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}
