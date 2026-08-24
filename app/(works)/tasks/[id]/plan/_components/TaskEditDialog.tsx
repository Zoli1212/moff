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
import { X } from "lucide-react";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type WorkTaskDependencyDto,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import {
  createTaskDependency,
  createWorkTask,
  deleteTaskDependency,
  updateWorkTask,
} from "@/actions/work-plan-actions";

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
  /** Top-level tasks of this work, used as dependency candidates. */
  allTasks: WorkTaskDto[];
  dependencies: WorkTaskDependencyDto[];
  onDependencyChanged: () => void;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskEditDialog({
  draft,
  workforce,
  allTasks,
  dependencies,
  onDependencyChanged,
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

          {existing && (
            <PredecessorPicker
              task={existing}
              allTasks={allTasks}
              dependencies={dependencies}
              onChanged={onDependencyChanged}
            />
          )}

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

/**
 * Dependencies apply immediately rather than on save, because they are relationships
 * between two rows that already exist — there is nothing to roll back if the dialog is
 * closed with Cancel, and deferring them would make Cancel ambiguous.
 */
function PredecessorPicker({
  task,
  allTasks,
  dependencies,
  onChanged,
}: {
  task: WorkTaskDto;
  allTasks: WorkTaskDto[];
  dependencies: WorkTaskDependencyDto[];
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const current = dependencies.filter((edge) => edge.successorId === task.id);
  const currentIds = new Set(current.map((edge) => edge.predecessorId));
  const byId = new Map(allTasks.map((candidate) => [candidate.id, candidate]));

  const candidates = allTasks.filter(
    (candidate) => candidate.id !== task.id && !currentIds.has(candidate.id)
  );

  const add = (predecessorId: number) => {
    startTransition(async () => {
      const result = await createTaskDependency(predecessorId, task.id);
      if (!result.success) {
        toast.error(result.error ?? "A kapcsolat létrehozása nem sikerült.");
        return;
      }
      onChanged();
    });
  };

  const remove = (dependencyId: number) => {
    startTransition(async () => {
      const result = await deleteTaskDependency(dependencyId);
      if (!result.success) {
        toast.error(result.error ?? "A kapcsolat törlése nem sikerült.");
        return;
      }
      onChanged();
    });
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-700">
        Előzmények — ezeknek előbb kell befejeződniük
      </span>

      {current.length > 0 && (
        <ul className="mb-2 space-y-1">
          {current.map((edge) => (
            <li
              key={edge.id}
              className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                {byId.get(edge.predecessorId)?.title ?? "Ismeretlen feladat"}
              </span>
              <button
                type="button"
                onClick={() => remove(edge.id)}
                disabled={isPending}
                aria-label="Kapcsolat törlése"
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <select
        value=""
        disabled={isPending || candidates.length === 0}
        onChange={(event) => {
          if (event.target.value) add(Number(event.target.value));
        }}
        className={inputClass}
      >
        <option value="">
          {candidates.length === 0
            ? "Nincs több választható feladat"
            : "Előzmény hozzáadása…"}
        </option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.title}
          </option>
        ))}
      </select>

      <p className="mt-1 text-[11px] text-gray-400">
        A nyíl csak jelzi az összefüggést — a dátumokat nem tolja el automatikusan.
      </p>
    </div>
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
