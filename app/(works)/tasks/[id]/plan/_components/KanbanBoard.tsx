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
  TASK_STATUS_LABELS,
  isTaskStatus,
  type TaskStatus,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import { updateWorkTaskStatus } from "@/actions/work-plan-actions";
import KanbanCard from "./KanbanCard";

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
  /**
   * Statuses applied locally the moment a card is dropped. Without this the card snaps
   * back to its old column until the refetch lands, which reads as a failed drag.
   */
  const [optimistic, setOptimistic] = useState<Record<number, TaskStatus>>({});
  const [activeTask, setActiveTask] = useState<WorkTaskDto | null>(null);

  // Two sensors rather than PointerSensor, because touch and mouse need opposite
  // behaviour: on a phone an immediate drag would hijack column scrolling, so touch
  // requires a short press-and-hold, while a mouse starts dragging after a few pixels.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    })
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
        toast.error(result.error ?? "A státusz módosítása nem sikerült.");
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
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:grid md:grid-cols-4 md:snap-none md:overflow-visible">
        {TASK_STATUSES.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            count={columns[status].length}
          >
            {columns[status].length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-gray-400">
                Húzz ide egy feladatot
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
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="w-[85vw] shrink-0 snap-start md:w-auto">
      <header className="mb-2 flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: COLUMN_ACCENT[status] }}
          aria-hidden
        />
        <h2 className="text-sm font-semibold text-gray-900">
          {TASK_STATUS_LABELS[status]}
        </h2>
        <span className="text-xs text-gray-400">{count}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`min-h-[140px] space-y-2 rounded-xl p-2 transition-colors ${
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
