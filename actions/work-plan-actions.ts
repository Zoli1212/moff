"use server";

/**
 * Server actions behind the work schedule (Gantt/Kanban).
 *
 * Only async functions may be exported from a "use server" module — schemas, types and
 * constants live in lib/work-plan/schema.ts.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import {
  aiPlanSchema,
  buildPlanCreateInputs,
  buildWorkItemIndex,
  filterAcyclicEdges,
  isTaskStatus,
  mapRowsToTaskTree,
  normalizeItemName,
  resolvePlanBaseDate,
  wouldCreateCycle,
  type DependencyEdge,
  type TaskStatus,
  type WorkTaskDependencyDto,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";
import {
  createOpenAiApiError,
  describeOpenAiFailure,
} from "@/lib/openai/errors";

/**
 * Marks an error whose message was written for the user and is safe to display.
 * Anything without this flag is treated as internal and never surfaces verbatim —
 * raw driver output leaks schema details and reads as a crash to the person using it.
 */
function planError(message: string): Error {
  const error = new Error(message) as Error & { userFacing?: boolean };
  error.userFacing = true;
  return error;
}

function toUserFacingMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    (error as { userFacing?: boolean }).userFacing
  ) {
    return (error as Error).message;
  }

  // P2021: the table is missing, which means the migration has not been applied yet.
  // Worth naming explicitly — it is a setup step, not a failure the user can retry into.
  if ((error as { code?: string })?.code === "P2021") {
    return "Az ütemterv még nincs aktiválva ebben a környezetben: hiányzik az adatbázis-tábla. Futtasd le a migrációt (npx prisma migrate deploy).";
  }

  console.error("[work-plan] Unexpected error:", error);
  return "Váratlan hiba történt az ütemterv betöltésekor. Próbáld újra.";
}

/**
 * The schedule is tenant-only by product decision, so every entry point re-checks it.
 * The page guard is for layout; this is the one that actually protects the data.
 */
async function requireTenant(): Promise<{ tenantEmail: string }> {
  const { tenantEmail, originalUserEmail } = await getTenantSafeAuth();

  const user = await prisma.user.findFirst({
    where: { email: originalUserEmail },
    select: { isTenant: true },
  });

  if (!user?.isTenant) {
    throw planError("Az ütemtervhez nincs jogosultságod.");
  }

  return { tenantEmail };
}

/** Confirms the work belongs to this tenant before anything touches its tasks. */
async function assertWorkOwned(workId: number, tenantEmail: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      title: true,
      tenantEmail: true,
      startDate: true,
      endDate: true,
      location: true,
      offerDescription: true,
      estimatedDuration: true,
    },
  });

  if (!work || work.tenantEmail !== tenantEmail) {
    throw planError("A munka nem található.");
  }

  return work;
}

/** Loads one task and confirms ownership, so a guessed id cannot reach another tenant. */
async function assertTaskOwned(taskId: number, tenantEmail: string) {
  const task = await prisma.workTask.findUnique({
    where: { id: taskId },
    select: { id: true, workId: true, tenantEmail: true },
  });

  if (!task || task.tenantEmail !== tenantEmail) {
    throw planError("A feladat nem található.");
  }

  return task;
}

function revalidatePlan(workId: number) {
  revalidatePath(`/tasks/${workId}/plan`);
}

/* -------------------------------------------------------------------------- */
/* Read                                                                        */
/* -------------------------------------------------------------------------- */

export async function getWorkPlan(workId: number): Promise<{
  success: boolean;
  error?: string;
  workTitle?: string;
  workStartDate?: string | null;
  tasks?: WorkTaskDto[];
  dependencies?: WorkTaskDependencyDto[];
}> {
  try {
    const { tenantEmail } = await requireTenant();
    const work = await assertWorkOwned(workId, tenantEmail);

    const rows = await prisma.workTask.findMany({
      where: { workId, tenantEmail },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: {
        id: true,
        parentId: true,
        workItemId: true,
        title: true,
        description: true,
        trade: true,
        status: true,
        order: true,
        startDate: true,
        endDate: true,
        progress: true,
        workforceRegistryId: true,
        aiGenerated: true,
        workforceRegistry: { select: { name: true, avatarUrl: true } },
      },
    });

    const dependencies = await prisma.workTaskDependency.findMany({
      where: { workId, tenantEmail },
      select: { id: true, predecessorId: true, successorId: true },
    });

    return {
      success: true,
      workTitle: work.title,
      workStartDate: work.startDate ? work.startDate.toISOString() : null,
      tasks: mapRowsToTaskTree(rows),
      dependencies,
    };
  } catch (error) {
    return {
      success: false,
      error: toUserFacingMessage(error),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* AI generation                                                               */
/* -------------------------------------------------------------------------- */

const PLAN_SYSTEM_PROMPT = `Te egy építőipari kivitelezés-ütemező szakértő vagy. A megadott munka és tételei alapján reális kivitelezési ütemtervet készítesz.

KÖTELEZŐ SZABÁLYOK:
1. Kizárólag JSON objektumot adj vissza, semmi mást.
2. SOHA ne adj vissza dátumot. Helyette "offsetDays" (a munka kezdetétől számított nap, 0 = első nap) és "durationDays" (hány napig tart, minimum 1).
3. Minden feladatnál KÖTELEZŐ a "trade" mező: a szakma magyarul, egy-két szóban (pl. "kőműves", "villanyszerelő", "burkoló", "festő", "gépész").
4. A sorrend legyen szakmailag helyes. Tipikus lánc: bontás → szerkezetépítés → gépészeti és elektromos alapszerelés → vakolás → aljzat → burkolás → szerelvényezés → festés → takarítás.
5. Ha egy feladat a megadott tételek egyikéhez tartozik, a "workItemName" mezőbe MÁSOLD BE PONTOSAN a tétel nevét, karakterre egyezően. Ha nem tartozik tételhez, legyen null.
6. Az összetett feladatokat bontsd alfeladatokra a "subtasks" tömbben (feladatonként legfeljebb 20). Az alfeladat "offsetDays" értéke IS a munka kezdetétől számít, nem a szülőtől.
7. A párhuzamosan végezhető szakmák időintervalluma átfedhet — ne fűzz mindent sorba feleslegesen.
8. Számold bele a technológiai várakozásokat (kötés, száradás) külön feladatként vagy a durationDays-be.
9. Legfeljebb 100 fő feladat.
10. A "dependsOn" tömbbe azoknak a feladatoknak a NEVÉT írd, amiknek KÖTELEZŐEN be kell fejeződniük az adott feladat megkezdése előtt. A nevet karakterre egyezően másold be egy másik feladat "title" mezőjéből. Csak valódi szakmai függőséget adj meg (pl. a festés függ a vakolástól), ne fűzz össze mindent láncba. Ha nincs valódi előzmény, hagyd ki a mezőt. Körkörös hivatkozás TILOS.

VÁLASZ FORMÁTUM:
{
  "tasks": [
    {
      "title": "Feladat neve magyarul",
      "trade": "szakma",
      "description": "rövid leírás, opcionális",
      "offsetDays": 0,
      "durationDays": 3,
      "workItemName": "A tétel pontos neve vagy null",
      "dependsOn": ["Egy másik feladat pontos title-je"],
      "subtasks": [
        { "title": "Alfeladat", "trade": "szakma", "offsetDays": 0, "durationDays": 1 }
      ]
    }
  ]
}`;

export async function generateWorkPlan(workId: number): Promise<{
  success: boolean;
  error?: string;
  createdTasks?: number;
  replacedTasks?: number;
  createdDependencies?: number;
  usedFallbackDate?: boolean;
}> {
  try {
    const { tenantEmail } = await requireTenant();
    const work = await assertWorkOwned(workId, tenantEmail);

    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: "Az OPENAI_API_KEY nincs beállítva." };
    }

    const workItems = await prisma.workItem.findMany({
      where: { workId, tenantEmail },
      select: { id: true, name: true, quantity: true, unit: true },
      orderBy: { id: "asc" },
    });

    const itemLines = workItems.length
      ? workItems
          .map((item) => `- ${item.name} (${item.quantity} ${item.unit})`)
          .join("\n")
      : "(nincs rögzített tétel)";

    const durationHint = work.endDate && work.startDate
      ? `\nA munka tervezett időtartama: ${Math.max(
          1,
          Math.round(
            (work.endDate.getTime() - work.startDate.getTime()) / 86_400_000
          ) + 1
        )} nap.`
      : work.estimatedDuration
        ? `\nBecsült időtartam: ${work.estimatedDuration}.`
        : "";

    const userPrompt = `MUNKA: ${work.title}
${work.location ? `HELYSZÍN: ${work.location}\n` : ""}${
      work.offerDescription ? `LEÍRÁS: ${work.offerDescription}\n` : ""
    }${durationHint}

TÉTELEK:
${itemLines}

Készíts ütemtervet a fenti szabályok szerint.`;

    // No retry loop here on purpose: this runs inside a request capped at 60s, and the
    // backoff a rate limit actually needs is longer than that budget. Failing fast leaves
    // the existing schedule untouched and lets the user retry deliberately.
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        // Guarantees parseable JSON, so no fenced-code-block extraction is needed.
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: PLAN_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw createOpenAiApiError(response.status, body);
    }

    const data = await response.json();
    const rawContent: unknown = data?.choices?.[0]?.message?.content;

    if (typeof rawContent !== "string" || !rawContent.trim()) {
      return {
        success: false,
        error: "Az AI üres választ adott. Az eddigi ütemterv változatlan maradt.",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      console.error(
        "[work-plan] Unparseable AI response (truncated):",
        rawContent.slice(0, 500)
      );
      return {
        success: false,
        error: "Az AI válasza nem értelmezhető. Az eddigi ütemterv változatlan maradt.",
      };
    }

    const parsed = aiPlanSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error(
        "[work-plan] AI response failed validation:",
        parsed.error.issues.slice(0, 5)
      );
      return {
        success: false,
        error: "Az AI hibás szerkezetű ütemtervet adott. Az eddigi ütemterv változatlan maradt.",
      };
    }

    const { baseDate, usedFallback } = resolvePlanBaseDate(
      work.startDate,
      new Date()
    );

    const inputs = buildPlanCreateInputs(parsed.data, {
      workId,
      tenantEmail,
      baseDate,
      workItemIndex: buildWorkItemIndex(workItems),
    });

    const result = await prisma.$transaction(
      async (tx) => {
        const aiTasks = await tx.workTask.findMany({
          where: { workId, tenantEmail, aiGenerated: true },
          select: { id: true },
        });
        const aiTaskIds = new Set(aiTasks.map((task) => task.id));

        // Detach edited subtasks from AI parents before deleting those parents.
        // parentId cascades on delete, so without this an edited child would be
        // destroyed along with the AI parent it happens to hang under.
        const editedChildren = await tx.workTask.findMany({
          where: {
            workId,
            tenantEmail,
            aiGenerated: false,
            parentId: { not: null },
          },
          select: { id: true, parentId: true },
        });
        const toDetach = editedChildren
          .filter((child) => child.parentId != null && aiTaskIds.has(child.parentId))
          .map((child) => child.id);

        if (toDetach.length) {
          await tx.workTask.updateMany({
            where: { id: { in: toDetach } },
            data: { parentId: null },
          });
        }

        await tx.workTask.deleteMany({
          where: { workId, tenantEmail, aiGenerated: true },
        });

        // createManyAndReturn preserves input order on PostgreSQL, but the parent ids
        // are mapped back through the unique `order` value rather than array position,
        // so a future ordering change cannot silently mis-parent every subtask.
        const createdParents = await tx.workTask.createManyAndReturn({
          data: inputs.map(({ children: _children, ...parent }) => parent),
          select: { id: true, order: true },
        });

        const parentIdByOrder = new Map(
          createdParents.map((parent) => [parent.order, parent.id])
        );

        const childRows = inputs.flatMap((task) => {
          const parentId = parentIdByOrder.get(task.order);
          if (parentId == null) return [];
          return task.children.map((child) => ({ ...child, parentId }));
        });

        if (childRows.length) {
          await tx.workTask.createMany({ data: childRows });
        }

        // Dependencies resolve last, because only now do the tasks have ids. Titles are
        // matched the same way item names are: normalised, first match wins, anything
        // unmatched is dropped rather than guessed at.
        const idByTitle = new Map<string, number>();
        parsed.data.tasks.forEach((task, index) => {
          const id = parentIdByOrder.get(index);
          const key = normalizeItemName(task.title);
          if (id != null && key && !idByTitle.has(key)) idByTitle.set(key, id);
        });

        const candidateEdges: DependencyEdge[] = [];
        parsed.data.tasks.forEach((task, index) => {
          const successorId = parentIdByOrder.get(index);
          if (successorId == null || !task.dependsOn?.length) return;
          for (const name of task.dependsOn) {
            const predecessorId = idByTitle.get(normalizeItemName(name));
            if (predecessorId == null || predecessorId === successorId) continue;
            candidateEdges.push({ predecessorId, successorId });
          }
        });

        // A single bad arrow must not cost an otherwise good schedule, so loops and
        // duplicates are dropped here instead of failing the whole generation.
        const edges = filterAcyclicEdges(candidateEdges);

        if (edges.length) {
          await tx.workTaskDependency.createMany({
            data: edges.map((edge) => ({ ...edge, workId, tenantEmail })),
          });
        }

        return {
          replaced: aiTaskIds.size,
          created: createdParents.length + childRows.length,
          dependencies: edges.length,
        };
      },
      // The default 5s interactive-transaction budget is tight for a large plan.
      { timeout: 20_000, maxWait: 10_000 }
    );

    revalidatePlan(workId);

    return {
      success: true,
      createdTasks: result.created,
      replacedTasks: result.replaced,
      createdDependencies: result.dependencies,
      usedFallbackDate: usedFallback,
    };
  } catch (error) {
    console.error("[work-plan] generateWorkPlan failed:", error);
    // A database or permission failure must not be reported as an AI failure: the two
    // need completely different fixes from whoever reads the message. Prisma error codes
    // match P####, which is specific enough not to swallow a network error from fetch.
    const isDatabaseOrGuardError =
      (error as { userFacing?: boolean })?.userFacing === true ||
      /^P\d{4}$/.test((error as { code?: string })?.code ?? "");
    return {
      success: false,
      error: isDatabaseOrGuardError
        ? toUserFacingMessage(error)
        : describeOpenAiFailure(error),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export async function createWorkTask(input: {
  workId: number;
  parentId?: number | null;
  title: string;
  trade: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  workforceRegistryId?: number | null;
}): Promise<{ success: boolean; error?: string; taskId?: number }> {
  try {
    const { tenantEmail } = await requireTenant();
    await assertWorkOwned(input.workId, tenantEmail);

    const title = input.title.trim();
    const trade = input.trade.trim();
    if (!title) return { success: false, error: "A feladat neve kötelező." };
    if (!trade) return { success: false, error: "A szakma megadása kötelező." };

    // A parent from another work would produce a task that renders under a schedule
    // it does not belong to, so the parent is verified rather than trusted.
    if (input.parentId != null) {
      const parent = await assertTaskOwned(input.parentId, tenantEmail);
      if (parent.workId !== input.workId) {
        return { success: false, error: "A szülő feladat másik munkához tartozik." };
      }
    }

    const lastOrder = await prisma.workTask.findFirst({
      where: {
        workId: input.workId,
        tenantEmail,
        parentId: input.parentId ?? null,
      },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const created = await prisma.workTask.create({
      data: {
        workId: input.workId,
        tenantEmail,
        parentId: input.parentId ?? null,
        title,
        trade,
        description: input.description?.trim() || null,
        status: "todo",
        order: (lastOrder?.order ?? -1) + 1,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        progress: 0,
        workforceRegistryId: input.workforceRegistryId ?? null,
        // Hand-created tasks are never candidates for regeneration cleanup.
        aiGenerated: false,
      },
      select: { id: true },
    });

    revalidatePlan(input.workId);
    return { success: true, taskId: created.id };
  } catch (error) {
    return {
      success: false,
      error: toUserFacingMessage(error),
    };
  }
}

export async function updateWorkTask(
  taskId: number,
  patch: {
    title?: string;
    trade?: string;
    description?: string | null;
    status?: string;
    progress?: number;
    startDate?: string | null;
    endDate?: string | null;
    workforceRegistryId?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await requireTenant();
    const task = await assertTaskOwned(taskId, tenantEmail);

    if (patch.status !== undefined && !isTaskStatus(patch.status)) {
      return { success: false, error: "Ismeretlen státusz." };
    }

    const title = patch.title?.trim();
    if (patch.title !== undefined && !title) {
      return { success: false, error: "A feladat neve nem lehet üres." };
    }

    const trade = patch.trade?.trim();
    if (patch.trade !== undefined && !trade) {
      return { success: false, error: "A szakma nem lehet üres." };
    }

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(trade !== undefined ? { trade } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(patch.status !== undefined
          ? { status: patch.status as TaskStatus }
          : {}),
        ...(patch.progress !== undefined
          ? { progress: Math.min(100, Math.max(0, Math.round(patch.progress))) }
          : {}),
        ...(patch.startDate !== undefined
          ? { startDate: patch.startDate ? new Date(patch.startDate) : null }
          : {}),
        ...(patch.endDate !== undefined
          ? { endDate: patch.endDate ? new Date(patch.endDate) : null }
          : {}),
        ...(patch.workforceRegistryId !== undefined
          ? { workforceRegistryId: patch.workforceRegistryId }
          : {}),
        // Touching a task makes it the user's. Regeneration only clears untouched
        // AI output, so edits survive it.
        aiGenerated: false,
      },
    });

    revalidatePlan(task.workId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toUserFacingMessage(error),
    };
  }
}

export async function updateWorkTaskStatus(
  taskId: number,
  status: string
): Promise<{ success: boolean; error?: string }> {
  return updateWorkTask(taskId, { status });
}

export async function deleteWorkTask(
  taskId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await requireTenant();
    const task = await assertTaskOwned(taskId, tenantEmail);

    // Subtasks cascade with the parent by design: a subtask has no meaning without it.
    await prisma.workTask.delete({ where: { id: taskId } });

    revalidatePlan(task.workId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toUserFacingMessage(error),
    };
  }
}

export async function createTaskDependency(
  predecessorId: number,
  successorId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await requireTenant();

    if (predecessorId === successorId) {
      return { success: false, error: "Egy feladat nem függhet önmagától." };
    }

    const predecessor = await assertTaskOwned(predecessorId, tenantEmail);
    const successor = await assertTaskOwned(successorId, tenantEmail);

    if (predecessor.workId !== successor.workId) {
      return {
        success: false,
        error: "Csak ugyanahhoz a munkához tartozó feladatok köthetők össze.",
      };
    }

    const existing = await prisma.workTaskDependency.findMany({
      where: { workId: successor.workId, tenantEmail },
      select: { predecessorId: true, successorId: true },
    });

    // Checked before writing rather than after: a loop would hang the arrow renderer,
    // so it must never reach the database in the first place.
    if (wouldCreateCycle(existing, predecessorId, successorId)) {
      return {
        success: false,
        error: "Ez a kapcsolat körkörös függőséget hozna létre.",
      };
    }

    await prisma.workTaskDependency.create({
      data: {
        workId: successor.workId,
        predecessorId,
        successorId,
        tenantEmail,
      },
    });

    revalidatePlan(successor.workId);
    return { success: true };
  } catch (error) {
    // The unique index is the last line of defence against a double submit.
    if ((error as { code?: string })?.code === "P2002") {
      return { success: false, error: "Ez a kapcsolat már létezik." };
    }
    return { success: false, error: toUserFacingMessage(error) };
  }
}

export async function deleteTaskDependency(
  dependencyId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await requireTenant();

    const dependency = await prisma.workTaskDependency.findUnique({
      where: { id: dependencyId },
      select: { id: true, workId: true, tenantEmail: true },
    });

    if (!dependency || dependency.tenantEmail !== tenantEmail) {
      return { success: false, error: "A kapcsolat nem található." };
    }

    await prisma.workTaskDependency.delete({ where: { id: dependencyId } });

    revalidatePlan(dependency.workId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserFacingMessage(error) };
  }
}

/** Named people the schedule can assign work to. */
export async function getAssignableWorkforce(): Promise<{
  success: boolean;
  error?: string;
  workforce?: Array<{
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
  }>;
}> {
  try {
    const { tenantEmail } = await requireTenant();

    const workforce = await prisma.workforceRegistry.findMany({
      where: { tenantEmail, isActive: true, isDeleted: false },
      select: { id: true, name: true, role: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });

    return { success: true, workforce };
  } catch (error) {
    return {
      success: false,
      error: toUserFacingMessage(error),
    };
  }
}
