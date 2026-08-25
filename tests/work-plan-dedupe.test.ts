import { describe, expect, it } from "vitest";
import {
  dedupeAiPlanTasks,
  buildPlanCreateInputs,
  buildWorkItemIndex,
  type AiPlan,
} from "../lib/work-plan/schema";

/**
 * Reproduces what work 91 actually received on 2026-08-25: the model returned
 * "Régi hidegburkolat bontása" twice in one response with different dates, which
 * produced duplicate cards and a dependency that appeared to point a task at itself.
 */
function task(title: string, offsetDays: number, extra: Partial<AiPlan["tasks"][number]> = {}) {
  return {
    title,
    trade: "bontó",
    offsetDays,
    durationDays: 2,
    ...extra,
  } as AiPlan["tasks"][number];
}

describe("dedupeAiPlanTasks", () => {
  it("drops a repeated task title and keeps the first occurrence", () => {
    const plan: AiPlan = {
      tasks: [
        task("Régi hidegburkolat bontása", 0),
        task("Vízvezeték szerelés", 3),
        task("Régi hidegburkolat bontása", 5),
      ],
    };

    const result = dedupeAiPlanTasks(plan);

    expect(result.droppedTasks).toBe(1);
    expect(result.plan.tasks.map((t) => t.title)).toEqual([
      "Régi hidegburkolat bontása",
      "Vízvezeték szerelés",
    ]);
    // First occurrence wins, so the surviving task keeps the earlier date.
    expect(result.plan.tasks[0].offsetDays).toBe(0);
  });

  it("treats titles differing only by case or spacing as the same", () => {
    const plan: AiPlan = {
      tasks: [task("Padlócsempe ragasztása", 0), task("  padlócsempe   RAGASZTÁSA ", 4)],
    };

    expect(dedupeAiPlanTasks(plan).plan.tasks).toHaveLength(1);
  });

  it("drops repeated subtasks within one parent", () => {
    const plan: AiPlan = {
      tasks: [
        task("Burkolás", 0, {
          subtasks: [
            { title: "Ragasztás", trade: "burkoló", offsetDays: 0, durationDays: 1 },
            { title: "Ragasztás", trade: "burkoló", offsetDays: 1, durationDays: 1 },
            { title: "Fugázás", trade: "burkoló", offsetDays: 2, durationDays: 1 },
          ],
        }),
      ],
    };

    const result = dedupeAiPlanTasks(plan);

    expect(result.droppedSubtasks).toBe(1);
    expect(result.plan.tasks[0].subtasks?.map((s) => s.title)).toEqual([
      "Ragasztás",
      "Fugázás",
    ]);
  });

  it("keeps the same subtask title under different parents", () => {
    const plan: AiPlan = {
      tasks: [
        task("Padlócsempe", 0, {
          subtasks: [{ title: "Fugázás", trade: "burkoló", offsetDays: 1, durationDays: 1 }],
        }),
        task("Falicsempe", 3, {
          subtasks: [{ title: "Fugázás", trade: "burkoló", offsetDays: 4, durationDays: 1 }],
        }),
      ],
    };

    const result = dedupeAiPlanTasks(plan);

    expect(result.droppedSubtasks).toBe(0);
    expect(result.plan.tasks).toHaveLength(2);
  });

  it("leaves a plan without repeats untouched", () => {
    const plan: AiPlan = {
      tasks: [task("Bontás", 0), task("Szerelés", 2), task("Festés", 5)],
    };

    const result = dedupeAiPlanTasks(plan);

    expect(result.droppedTasks).toBe(0);
    expect(result.plan.tasks).toHaveLength(3);
  });

  it("renumbers order after deduplication so subtasks cannot be mis-parented", () => {
    // buildPlanCreateInputs assigns `order` from array position, and the action maps
    // dependencies back through that value. A gap would silently mis-parent them.
    const plan: AiPlan = {
      tasks: [task("A", 0), task("A", 1), task("B", 2), task("C", 3)],
    };

    const { plan: deduped } = dedupeAiPlanTasks(plan);
    const inputs = buildPlanCreateInputs(deduped, {
      workId: 1,
      tenantEmail: "t@example.com",
      baseDate: new Date("2026-08-24T00:00:00.000Z"),
      workItemIndex: buildWorkItemIndex([]),
    });

    expect(inputs.map((i) => i.order)).toEqual([0, 1, 2]);
    expect(inputs.map((i) => i.title)).toEqual(["A", "B", "C"]);
  });
});
