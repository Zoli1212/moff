/**
 * Pure, dependency-free logic behind the work schedule (Gantt/Kanban).
 *
 * Kept out of the "use server" action module on purpose: a "use server" file may only
 * export async functions, so schemas, types and constants must live somewhere else.
 *
 * Everything here is deterministic. The AI never produces dates or database ids —
 * it produces day offsets and item names, and this module turns those into concrete
 * values. That keeps calendar arithmetic and referential integrity out of the model's hands.
 */

import { z } from "zod";

/** Kanban columns, in display order. */
export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Teendő",
  in_progress: "Folyamatban",
  blocked: "Akadályozva",
  done: "Kész",
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value)
  );
}

/* -------------------------------------------------------------------------- */
/* AI response schemas                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Upper bounds are deliberate. They are not style choices: an unbounded array or
 * string from a model response turns into an unbounded write, and a runaway plan
 * would be far more painful to clean up than a rejected one.
 */
const MAX_TASKS = 100;
const MAX_SUBTASKS = 20;
/** ~10 years, so a nonsense offset is rejected instead of landing in the year 3000. */
const MAX_DAYS = 3650;

const aiSubTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  trade: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  /** Days from the start of the work, not from the parent task. */
  offsetDays: z.number().int().min(0).max(MAX_DAYS),
  /** Inclusive: a durationDays of 1 starts and ends on the same day. */
  durationDays: z.number().int().min(1).max(MAX_DAYS),
});

const aiTaskSchema = aiSubTaskSchema.extend({
  /**
   * Name of the matching offer line item, or null. Deliberately a name and not an id:
   * a model can invent a plausible id, and an invented foreign key would corrupt data.
   * Names get matched against real items and fall back to null when they do not match.
   */
  workItemName: z.string().trim().max(500).nullish(),
  subtasks: z.array(aiSubTaskSchema).max(MAX_SUBTASKS).optional(),
});

export const aiPlanSchema = z.object({
  tasks: z.array(aiTaskSchema).min(1).max(MAX_TASKS),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;
export type AiTask = z.infer<typeof aiTaskSchema>;

/* -------------------------------------------------------------------------- */
/* Date arithmetic                                                             */
/* -------------------------------------------------------------------------- */

const MS_PER_DAY = 86_400_000;

/**
 * All schedule dates are anchored to UTC midnight. Local-midnight arithmetic drifts
 * by an hour across a DST boundary, which is enough to push a bar onto the wrong day.
 */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole days between two dates, ignoring time of day. Negative if `to` precedes `from`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / MS_PER_DAY
  );
}

/**
 * The schedule anchor. Falls back to today when the work has no start date, and reports
 * that it did so, so the caller can tell the user rather than silently inventing a date.
 */
export function resolvePlanBaseDate(
  workStartDate: Date | null | undefined,
  now: Date
): { baseDate: Date; usedFallback: boolean } {
  if (workStartDate) {
    return { baseDate: startOfUtcDay(workStartDate), usedFallback: false };
  }
  return { baseDate: startOfUtcDay(now), usedFallback: true };
}

export function computeTaskDates(
  baseDate: Date,
  offsetDays: number,
  durationDays: number
): { startDate: Date; endDate: Date } {
  const startDate = addDays(baseDate, offsetDays);
  // durationDays is inclusive, so a one-day task ends on its start day.
  const endDate = addDays(startDate, Math.max(1, durationDays) - 1);
  return { startDate, endDate };
}

/* -------------------------------------------------------------------------- */
/* Work item matching                                                          */
/* -------------------------------------------------------------------------- */

export function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Builds a lookup from normalized item name to item id.
 *
 * First occurrence wins. Duplicate item names do exist in practice, and silently
 * re-pointing an already indexed name would make the link depend on row order.
 */
export function buildWorkItemIndex(
  items: ReadonlyArray<{ id: number; name: string }>
): Map<string, number> {
  const index = new Map<string, number>();
  for (const item of items) {
    const key = normalizeItemName(item.name ?? "");
    if (!key || index.has(key)) continue;
    index.set(key, item.id);
  }
  return index;
}

export function matchWorkItemId(
  name: string | null | undefined,
  index: ReadonlyMap<string, number>
): number | null {
  if (!name) return null;
  return index.get(normalizeItemName(name)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Plan -> database rows                                                       */
/* -------------------------------------------------------------------------- */

export interface PlanBuildContext {
  workId: number;
  tenantEmail: string;
  baseDate: Date;
  workItemIndex: ReadonlyMap<string, number>;
}

/**
 * Shape handed to the client. Dates are ISO strings rather than Date objects so the
 * value survives the server boundary and JSON round-trips identically in both directions.
 */
export interface WorkTaskDto {
  id: number;
  parentId: number | null;
  workItemId: number | null;
  title: string;
  description: string | null;
  trade: string;
  status: TaskStatus;
  order: number;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  workforceRegistryId: number | null;
  workforceName: string | null;
  workforceAvatarUrl: string | null;
  aiGenerated: boolean;
  children: WorkTaskDto[];
}

/**
 * Groups a flat task list into parent/child order.
 *
 * Orphans — a child whose parent is missing or not in this list — are promoted to the
 * top level rather than dropped. A task that exists in the database must stay visible,
 * otherwise it becomes uneditable and invisible at the same time.
 */
export function buildTaskTree(
  tasks: ReadonlyArray<Omit<WorkTaskDto, "children">>
): WorkTaskDto[] {
  const byId = new Map<number, WorkTaskDto>();
  for (const task of tasks) {
    byId.set(task.id, { ...task, children: [] });
  }

  const roots: WorkTaskDto[] = [];
  for (const task of byId.values()) {
    const parent = task.parentId != null ? byId.get(task.parentId) : undefined;
    if (parent && parent.id !== task.id) {
      parent.children.push(task);
    } else {
      roots.push(task);
    }
  }

  const byOrder = (a: WorkTaskDto, b: WorkTaskDto) =>
    a.order - b.order || a.id - b.id;
  roots.sort(byOrder);
  for (const root of roots) root.children.sort(byOrder);

  return roots;
}

/** A database row as selected by the read action, before it crosses to the client. */
export interface WorkTaskRow {
  id: number;
  parentId: number | null;
  workItemId: number | null;
  title: string;
  description: string | null;
  trade: string;
  status: string;
  order: number;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  workforceRegistryId: number | null;
  aiGenerated: boolean;
  workforceRegistry: { name: string; avatarUrl: string | null } | null;
}

/**
 * Converts rows into the client-facing tree.
 *
 * `status` is stored as text, so an unrecognised value is coerced to "todo" rather than
 * trusted. Otherwise a stray value would land in no Kanban column and the task would
 * silently vanish from the board while still existing in the database.
 */
export function mapRowsToTaskTree(
  rows: ReadonlyArray<WorkTaskRow>
): WorkTaskDto[] {
  return buildTaskTree(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      workItemId: row.workItemId,
      title: row.title,
      description: row.description,
      trade: row.trade,
      status: isTaskStatus(row.status) ? row.status : "todo",
      order: row.order,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      progress: row.progress,
      workforceRegistryId: row.workforceRegistryId,
      workforceName: row.workforceRegistry?.name ?? null,
      workforceAvatarUrl: row.workforceRegistry?.avatarUrl ?? null,
      aiGenerated: row.aiGenerated,
    }))
  );
}

/** Rolls a parent's completion up from its children, falling back to its own value. */
export function effectiveProgress(task: WorkTaskDto): number {
  if (!task.children.length) return task.progress;
  const total = task.children.reduce((sum, child) => sum + child.progress, 0);
  return Math.round(total / task.children.length);
}

export interface WorkTaskNodeInput {
  workId: number;
  tenantEmail: string;
  title: string;
  description: string | null;
  trade: string;
  status: TaskStatus;
  order: number;
  startDate: Date;
  endDate: Date;
  progress: number;
  workItemId: number | null;
  aiGenerated: boolean;
}

export interface WorkTaskTreeInput extends WorkTaskNodeInput {
  children: WorkTaskNodeInput[];
}

/**
 * Turns a validated AI plan into rows ready to be written.
 *
 * Two rules worth knowing:
 *  - A subtask inherits its parent's work item link. Splitting one item into steps
 *    should not detach those steps from the item they bill against.
 *  - A parent with children spans its children (earliest start to latest end) rather
 *    than using its own offset. That is how a summary bar behaves in a Gantt chart,
 *    and it removes the chance of a parent bar that contradicts the rows beneath it.
 */
export function buildPlanCreateInputs(
  plan: AiPlan,
  ctx: PlanBuildContext
): WorkTaskTreeInput[] {
  return plan.tasks.map((task, taskIndex) => {
    const workItemId = matchWorkItemId(task.workItemName, ctx.workItemIndex);
    const own = computeTaskDates(ctx.baseDate, task.offsetDays, task.durationDays);

    const children: WorkTaskNodeInput[] = (task.subtasks ?? []).map(
      (subtask, subtaskIndex) => {
        const dates = computeTaskDates(
          ctx.baseDate,
          subtask.offsetDays,
          subtask.durationDays
        );
        return {
          workId: ctx.workId,
          tenantEmail: ctx.tenantEmail,
          title: subtask.title,
          description: subtask.description ?? null,
          trade: subtask.trade,
          status: "todo",
          order: subtaskIndex,
          startDate: dates.startDate,
          endDate: dates.endDate,
          progress: 0,
          workItemId,
          aiGenerated: true,
        };
      }
    );

    const startDate = children.length
      ? new Date(Math.min(...children.map((c) => c.startDate.getTime())))
      : own.startDate;
    const endDate = children.length
      ? new Date(Math.max(...children.map((c) => c.endDate.getTime())))
      : own.endDate;

    return {
      workId: ctx.workId,
      tenantEmail: ctx.tenantEmail,
      title: task.title,
      description: task.description ?? null,
      trade: task.trade,
      status: "todo",
      order: taskIndex,
      startDate,
      endDate,
      progress: 0,
      workItemId,
      aiGenerated: true,
      children,
    };
  });
}
