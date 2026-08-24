"use client";

import { useState, useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteConfirmModal from "@/components/ui/delete-confirm-modal";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  effectiveProgress,
  type TaskStatus,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import {
  deleteWorkTask,
  updateWorkTaskStatus,
} from "@/actions/work-plan-actions";

const STATUS_CHIP: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-orange-100 text-orange-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
};

/**
 * Schedule dates are stored at UTC midnight, so they are formatted in UTC too.
 * Rendering them in local time can shift a bar onto the neighbouring day.
 */
const dateFormatter = new Intl.DateTimeFormat("hu-HU", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) {
    const from = dateFormatter.format(new Date(start));
    const to = dateFormatter.format(new Date(end));
    return from === to ? from : `${from} – ${to}`;
  }
  return dateFormatter.format(new Date((start ?? end) as string));
}

/**
 * Stops a press on an interactive child from becoming a drag. Without it, opening the
 * action menu or the status dropdown would start dragging the card instead.
 */
const stopDrag = (event: React.PointerEvent) => event.stopPropagation();

interface Props {
  task: WorkTaskDto;
  onEdit: (task: WorkTaskDto) => void;
  onAddSubtask: (parent: WorkTaskDto) => void;
  onChanged: () => void;
}

export default function KanbanCard({
  task,
  onEdit,
  onAddSubtask,
  onChanged,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  const progress = effectiveProgress(task);
  const range = formatRange(task.startDate, task.endDate);
  const doneChildren = task.children.filter((c) => c.status === "done").length;

  const changeStatus = (status: TaskStatus) => {
    if (status === task.status) return;
    startTransition(async () => {
      const result = await updateWorkTaskStatus(task.id, status);
      if (!result.success) {
        toast.error(result.error ?? "A státusz módosítása nem sikerült.");
        return;
      }
      onChanged();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteWorkTask(task.id);
      setConfirmingDelete(false);
      if (!result.success) {
        toast.error(result.error ?? "A törlés nem sikerült.");
        return;
      }
      toast.success("Feladat törölve.");
      onChanged();
    });
  };

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      aria-roledescription={attributes["aria-roledescription"]}
      // touch-action stays "manipulation" so vertical scrolling still works: the touch
      // sensor only claims the gesture after a short hold.
      style={{ touchAction: "manipulation" }}
      className={`cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-opacity active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900">
          {task.title}
        </h3>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Műveletek"
              onPointerDown={stopDrag}
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" />
              Szerkesztés
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddSubtask(task)}>
              <Plus className="mr-2 h-4 w-4" />
              Alfeladat hozzáadása
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={() => setConfirmingDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Törlés
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
          {task.trade}
        </span>

        {/*
          Kept alongside drag and drop on purpose: it is the keyboard-reachable way to
          move a task, and the only one that works without a pointer.
        */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              onPointerDown={stopDrag}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_CHIP[task.status]}`}
            >
              {TASK_STATUS_LABELS[task.status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TASK_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onSelect={() => changeStatus(status)}
              >
                {TASK_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {range && <span className="text-[11px] text-gray-500">{range}</span>}
      </div>

      {task.workforceName && (
        <p className="mt-2 truncate text-xs text-gray-600">
          {task.workforceName}
        </p>
      )}

      {progress > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#FE9C00]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}

      {task.children.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onPointerDown={stopDrag}
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Alfeladatok {doneChildren}/{task.children.length}
          </button>

          {expanded && (
            <ul className="mt-1.5 space-y-1 border-l border-gray-200 pl-3">
              {task.children.map((child) => (
                <li key={child.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={stopDrag}
                    onClick={() => onEdit(child)}
                    className="min-w-0 flex-1 truncate text-left text-xs text-gray-700 hover:underline"
                  >
                    {child.title}
                  </button>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${STATUS_CHIP[child.status]}`}
                  >
                    {TASK_STATUS_LABELS[child.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={remove}
        isLoading={isPending}
        title="Feladat törlése"
        message={
          task.children.length > 0
            ? `A(z) „${task.title}" feladat és ${task.children.length} alfeladata is törlődik. Ez nem vonható vissza.`
            : `A(z) „${task.title}" feladat törlődik. Ez nem vonható vissza.`
        }
      />
    </article>
  );
}
