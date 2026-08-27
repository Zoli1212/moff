"use client";

import { useState, useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  GripHorizontal,
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
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  TASK_STATUSES,
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
 * Stops a press on an interactive child from becoming a drag, and from bubbling up to
 * the card's own tap-to-edit handler. Without it, opening the action menu would both
 * start a drag and open the edit dialog.
 */
const stopDrag = (event: React.PointerEvent) => event.stopPropagation();
const stopClick = (event: React.MouseEvent) => event.stopPropagation();

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
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({ id: task.id });

  const progress = effectiveProgress(task);
  const range = formatRange(task.startDate, task.endDate);
  const doneChildren = task.children.filter((c) => c.status === "done").length;

  const changeStatus = (status: TaskStatus) => {
    if (status === task.status) return;
    startTransition(async () => {
      const result = await updateWorkTaskStatus(task.id, status);
      if (!result.success) {
        toast.error(result.error ?? t("plan.statusFailed"));
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
        toast.error(result.error ?? t("sc.deleteFailed"));
        return;
      }
      toast.success(t("x.taskDeleted"));
      onChanged();
    });
  };

  return (
    <article
      ref={setNodeRef}
      aria-roledescription={attributes["aria-roledescription"]}
      // Tapping the body opens the editor. Dragging lives on the grip below, so the two
      // gestures never compete for the same touch.
      onClick={() => onEdit(task)}
      className={`rounded-md border border-gray-200 bg-white p-1.5 shadow-sm transition-opacity md:rounded-lg md:p-3 ${
        isDragging ? "opacity-40" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      {/*
        Dedicated drag handle. dnd-kit's TouchSensor needs `touch-action: none` on the
        element that starts the drag, and putting that on the whole card would kill
        vertical scrolling - in a four-column grid the cards cover most of the screen,
        leaving nowhere to scroll from. Confining it to the grip keeps both gestures.
      */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        role="button"
        aria-label={`${task.title} áthelyezése`}
        onClick={stopClick}
        style={{ touchAction: "none" }}
        className="-mx-0.5 -mt-0.5 mb-1 flex cursor-grab touch-none items-center justify-center rounded bg-gray-100 py-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 active:cursor-grabbing md:-mx-1 md:-mt-1"
      >
        <GripHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </div>

      <div className="flex items-start gap-1 md:gap-2">
        <h3 className="min-w-0 flex-1 text-[11px] font-medium leading-tight text-gray-900 md:text-sm md:leading-snug">
          {task.title}
        </h3>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("pr.actions")}
              onPointerDown={stopDrag}
              onClick={stopClick}
              className="-mr-0.5 -mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 md:-mr-1 md:-mt-1 md:h-7 md:w-7"
            >
              <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stopClick}>
            <DropdownMenuItem onSelect={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("de.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddSubtask(task)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("x.addSubtask")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={() => setConfirmingDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/*
        Below md only the trade survives, truncated. The status chip is dropped there
        because the column already states the status, and the date range and assignee
        do not survive an 88px column legibly - they are one tap away in the editor.
      */}
      <div className="mt-1 flex flex-wrap items-center gap-1 md:mt-2 md:gap-1.5">
        <span className="max-w-full truncate rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-700 md:px-1.5 md:text-[11px]">
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
              onClick={stopClick}
              className={`hidden rounded px-1.5 py-0.5 text-[11px] font-medium md:inline-block ${STATUS_CHIP[task.status]}`}
            >
              {t(`status.${task.status}`)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={stopClick}>
            {TASK_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onSelect={() => changeStatus(status)}
              >
                {t(`status.${status}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {range && (
          <span className="hidden text-[11px] text-gray-500 md:inline">
            {range}
          </span>
        )}
      </div>

      {task.workforceName && (
        <p className="mt-2 hidden truncate text-xs text-gray-600 md:block">
          {task.workforceName}
        </p>
      )}

      {progress > 0 && (
        <div className="mt-1 md:mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 md:h-1.5">
            <div
              className="h-full rounded-full bg-[#FE9C00]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}

      {task.children.length > 0 && (
        <div className="mt-1 md:mt-2">
          <button
            type="button"
            onPointerDown={stopDrag}
            onClick={(event) => {
              stopClick(event);
              setExpanded((value) => !value);
            }}
            className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500 hover:text-gray-700 md:gap-1 md:text-xs"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
            )}
            <span className="hidden md:inline">{t("plan.subtasks")} </span>
            {doneChildren}/{task.children.length}
          </button>

          {expanded && (
            <ul className="mt-1 space-y-0.5 border-l border-gray-200 pl-1.5 md:mt-1.5 md:space-y-1 md:pl-3">
              {task.children.map((child) => (
                <li key={child.id} className="flex items-center gap-1 md:gap-2">
                  <button
                    type="button"
                    onPointerDown={stopDrag}
                    onClick={(event) => {
                      stopClick(event);
                      onEdit(child);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-[9px] text-gray-700 hover:underline md:text-xs"
                  >
                    {child.title}
                  </button>
                  <span
                    className={`hidden shrink-0 rounded px-1 py-0.5 text-[10px] font-medium md:inline ${STATUS_CHIP[child.status]}`}
                  >
                    {t(`status.${child.status}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Wrapped because the modal is a child of the card in the React tree, so its
          clicks would otherwise bubble into the card's tap-to-edit handler. */}
      <div onClick={stopClick} onPointerDown={stopDrag}>
        <DeleteConfirmModal
          isOpen={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={remove}
          isLoading={isPending}
          title={t("x.deleteTask")}
          message={
            task.children.length > 0
              ? `A(z) „${task.title}" feladat és ${task.children.length} alfeladata is törlődik. Ez nem vonható vissza.`
              : `A(z) „${task.title}" feladat törlődik. Ez nem vonható vissza.`
          }
        />
      </div>
    </article>
  );
}
