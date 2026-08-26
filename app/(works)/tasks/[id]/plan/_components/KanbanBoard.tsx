"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  TASK_STATUSES,
  isTaskStatus,
  type TaskStatus,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import { updateWorkTaskStatus } from "@/actions/work-plan-actions";
import KanbanCard from "./KanbanCard";
import { useLocale } from "@/components/i18n/LocaleProvider";

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  todo: "#9CA3AF",
  in_progress: "#FE9C00",
  blocked: "#EF4444",
  done: "#10B981",
};

interface Props {
  tasks: WorkTaskDto[];
  onEdit: (task: WorkTaskDto) => void;
  onAddSubtask: (parent: WorkTaskDto) => void;
  onChanged: () => void;
}

export default function KanbanBoard({
  tasks,
  onEdit,
  onAddSubtask,
  onChanged,
}: Props) {
  const { t } = useLocale();

  /**
   * Statuses applied locally the moment a card is dropped. Without this the card snaps
   * back to its old column until the refetch lands, which reads as a failed drag.
   */
  const [optimistic, setOptimistic] = useState<Record<number, TaskStatus>>({});
  const [activeTask, setActiveTask] = useState<WorkTaskDto | null>(null);

  // Both sensors activate on a few pixels of movement. Touch used to require a
  // press-and-hold to tell a drag apart from a scroll, but that ambiguity disappeared
  // once dragging moved to a dedicated grip: a touch starting there can only be a drag.
  // Keeping the hold just made the board feel broken to anyone who dragged straight away.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } })
  );

  const effectiveTasks = useMemo(
    () =>
      tasks.map((task) =>
        optimistic[task.id] && optimistic[task.id] !== task.status
          ? { ...task, status: optimistic[task.id] }
          : task
      ),
    [tasks, optimistic]
  );

  // Drop an optimistic entry once the server data agrees with it, so the local override
  // never outlives the value it was standing in for.
  useEffect(() => {
    setOptimistic((current) => {
      const pending = Object.entries(current).filter(([id, status]) => {
        const task = tasks.find((candidate) => candidate.id === Number(id));
        return task && task.status !== status;
      });
      return pending.length === Object.keys(current).length
        ? current
        : Object.fromEntries(pending);
    });
  }, [tasks]);

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, WorkTaskDto[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    // Only top-level tasks get a column. Subtasks render inside their parent card so a
    // split task stays one unit on the board instead of scattering across four columns.
    for (const task of effectiveTasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [effectiveTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = effectiveTasks.find(
      (candidate) => candidate.id === Number(event.active.id)
    );
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const target = String(over.id);
    if (!isTaskStatus(target)) return;

    const taskId = Number(active.id);
    const task = effectiveTasks.find((candidate) => candidate.id === taskId);
    if (!task || task.status === target) return;

    const previous = task.status;
    setOptimistic((current) => ({ ...current, [taskId]: target }));

    void updateWorkTaskStatus(taskId, target).then((result) => {
      if (!result.success) {
        // Put the card back where it came from rather than leaving the board showing
        // a move that never reached the database.
        setOptimistic((current) => ({ ...current, [taskId]: previous }));
        toast.error(result.error ?? t("plan.statusFailed"));
        return;
      }
      onChanged();
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      {/*
        Four columns at every width. On a phone that leaves roughly 88px per column,
        so the cards switch to a compact layout rather than the board scrolling
        sideways - seeing all four states at once is the point of the board.
      */}
      <div className="mt-4 grid grid-cols-4 gap-1.5 px-2 pb-4 md:gap-3 md:px-4">
        {TASK_STATUSES.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            label={t(`status.${status}`)}
            count={columns[status].length}
          >
            {columns[status].length === 0 ? (
              <p className="py-4 text-center text-[10px] text-gray-400 md:py-6 md:text-xs">
                <span className="hidden md:inline">{t("plan.dropHere")}</span>
                <span className="md:hidden">—</span>
              </p>
            ) : (
              columns[status].map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onAddSubtask={onAddSubtask}
                  onChanged={onChanged}
                />
              ))
            )}
          </DroppableColumn>
        ))}
      </div>

      {/* The overlay follows the finger; the card left behind stays dimmed in place. */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? <CardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  status,
  label,
  count,
  children,
}: {
  status: TaskStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="min-w-0">
      <header className="mb-1.5 flex items-center gap-1 px-0.5 md:mb-2 md:gap-2 md:px-1">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full md:h-2.5 md:w-2.5"
          style={{ background: COLUMN_ACCENT[status] }}
          aria-hidden
        />
        <h2 className="truncate text-[10px] font-semibold text-gray-900 md:text-sm">
          {label}
        </h2>
        <span className="shrink-0 text-[10px] text-gray-400 md:text-xs">
          {count}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`min-h-[120px] space-y-1.5 rounded-lg p-1 transition-colors md:min-h-[140px] md:space-y-2 md:rounded-xl md:p-2 ${
          isOver
            ? "bg-orange-50 ring-2 ring-[#FE9C00]/40"
            : "bg-gray-50 ring-2 ring-transparent"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * A static copy for the drag overlay. Deliberately not a KanbanCard: that component
 * registers a draggable under the task id, and a second registration of the same id
 * would collide with the card being dragged.
 */
function CardPreview({ task }: { task: WorkTaskDto }) {
  return (
    <article className="w-[260px] rotate-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <h3 className="text-sm font-medium leading-snug text-gray-900">
        {task.title}
      </h3>
      <span className="mt-2 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
        {task.trade}
      </span>
    </article>
  );
}
