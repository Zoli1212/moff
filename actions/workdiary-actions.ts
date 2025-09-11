"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

// Resolve the effective tenant email. If the current user is a worker,
// look up their tenant in WorkforceRegistry by the worker's email.
// Prefer an explicitly provided workerEmail (selected in the UI),
// otherwise fall back to the logged-in user's email.
async function resolveTenantEmail(userEmail: string, workerEmail?: string) {
  const emailToLookup = workerEmail || userEmail;
  try {
    console.log("[workdiary-actions] resolveTenantEmail input", {
      userEmail,
      workerEmail,
    });
  } catch {}
  try {
    const registry = await prisma.workforceRegistry.findFirst({
      where: { email: emailToLookup },
      select: { tenantEmail: true },
    });
    if (registry?.tenantEmail) {
      try {
        console.log("[workdiary-actions] tenant resolved via registry", {
          emailToLookup,
          tenantEmail: registry.tenantEmail,
        });
      } catch {}
      return registry.tenantEmail;
    }
  } catch (_) {
    // noop – fallback below
  }
  // If not found in registry, assume userEmail is the tenant (tenant account case)
  try {
    console.log("[workdiary-actions] tenant fallback to userEmail", {
      userEmail,
    });
  } catch {}
  return userEmail;
}

// Try to derive the worker's email by WorkItemWorker.id.
// 1) Prefer WorkItemWorker.email
// 2) If missing, and workforceRegistryId is present, read WorkforceRegistry.email
async function getWorkerEmailFromAssignment(
  workItemWorkerId: number
): Promise<string | undefined> {
  try {
    const assignment = await prisma.workItemWorker.findUnique({
      where: { id: workItemWorkerId },
      select: { email: true, workforceRegistryId: true },
    });
    if (!assignment) return undefined;
    if (assignment.email) {
      try {
        console.log("[workdiary-actions] assignment email", {
          workItemWorkerId,
          email: assignment.email,
        });
      } catch {}
      return assignment.email;
    }
    if (assignment.workforceRegistryId) {
      const reg = await prisma.workforceRegistry.findUnique({
        where: { id: assignment.workforceRegistryId },
        select: { email: true },
      });
      try {
        console.log("[workdiary-actions] registry email via assignment", {
          workItemWorkerId,
          registryId: assignment.workforceRegistryId,
          email: reg?.email,
        });
      } catch {}
      return reg?.email ?? undefined;
    }
  } catch (_) {
    // ignore
  }
  return undefined;
}

export async function deleteWorkDiaryItem({
  id,
}: {
  id: number;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  await prisma.workDiaryItem.delete({ where: { id } });
  
  revalidatePath(`/works/diary`);
  return { success: true };
}

export async function deleteWorkDiary({
  workId,
  workItemId,
}: {
  workId: number;
  workItemId?: number;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const diary = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found for this work." };
  }

  await prisma.workDiary.delete({ where: { id: diary.id } });

  // Reset workItem inProgress status when diary is deleted
  if (workItemId) {
    await prisma.workItem.update({
      where: { id: workItemId },
      data: { inProgress: false },
    });
  }

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true };
}

export async function updateWorkDiary({
  id,
  workId,
  description,
  weather,
  temperature,
  progress,
  issues,
  notes,
  reportedById,
  reportedByName,
  unit,
  images,
}: {
  id: number;
  workId?: number;
  description?: string;
  weather?: string | null;
  temperature?: number | null;
  progress?: number | null;
  issues?: string | null;
  notes?: string | null;
  reportedById?: string | null;
  reportedByName?: string | null;
  unit?: string | null;
  images?: string[] | null;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const diary = await prisma.workDiary.findFirst({
    where: { id, workId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found or not owned by user." };
  }

  const data: any = {};
  if (description !== undefined) data.description = description;
  if (weather !== undefined) data.weather = weather;
  if (temperature !== undefined) data.temperature = temperature;
  if (progress !== undefined) data.progress = progress;
  if (issues !== undefined) data.issues = issues;
  if (notes !== undefined) data.notes = notes;
  if (reportedById !== undefined) data.reportedById = reportedById;
  if (reportedByName !== undefined) data.reportedByName = reportedByName;
  if (unit !== undefined) data.unit = unit;
  if (images !== undefined) data.images = images;

  const updated = await prisma.workDiary.update({
    where: { id },
    data,
  });

  revalidatePath(`/works/diary/${workId}`);
  return { success: true, data: updated };
}

/**
 * Update a WorkDiaryItem (not WorkDiary) entry
 */
export async function updateWorkDiaryItem({
  diaryId,
  id,
  workId,
  workItemId,
  workerId,
  email,
  name,
  workItemWorkerId,
  date,
  quantity,
  unit,
  workHours,
  images,
  notes,
  accepted,
}: {
  diaryId?: number;
  id: number;
  workId?: number;
  workItemId?: number;
  workerId?: number;
  email?: string;
  name?: string;
  workItemWorkerId?: number;
  date?: Date;
  quantity?: number;
  unit?: string;
  workHours?: number;
  images?: string[];
  notes?: string;
  accepted?: boolean;
}) {
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

  const updateData: any = {};
  if (diaryId !== undefined) updateData.diaryId = diaryId;
  if (workId !== undefined) updateData.workId = workId;
  if (workItemId !== undefined) updateData.workItemId = workItemId;
  if (workerId !== undefined) updateData.workerId = workerId;
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name;
  if (workItemWorkerId !== undefined)
    updateData.workItemWorkerId = workItemWorkerId;
  if (date !== undefined) updateData.date = date;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (unit !== undefined) updateData.unit = unit;
  if (workHours !== undefined) updateData.workHours = workHours;
  if (images !== undefined) updateData.images = images;
  if (notes !== undefined) updateData.notes = notes;
  if (typeof accepted === "boolean") updateData.accepted = accepted;

  // If email or assignment changed, recompute tenantEmail from worker's email if possible
  if (email !== undefined || workItemWorkerId !== undefined) {
    let effectiveWorkerEmail: string | undefined = email;
    if (!effectiveWorkerEmail && workItemWorkerId) {
      effectiveWorkerEmail =
        await getWorkerEmailFromAssignment(workItemWorkerId);
    }
    const resolvedTenant = await resolveTenantEmail(
      userEmail,
      effectiveWorkerEmail
    );
    updateData.tenantEmail = resolvedTenant;
  }

  try {
    try {
      console.log("[workdiary-actions] updateWorkDiaryItem input", {
        id,
        diaryId,
        workId,
        workItemId,
        workerId,
        name,
        email,
        workItemWorkerId,
      });
    } catch {}
    const updated = await prisma.workDiaryItem.update({
      where: { id },
      data: updateData,
    });
    try {
      console.log("[workdiary-actions] updateWorkDiaryItem", {
        id,
        updateData,
      });
    } catch {}
    if (workId) {
      revalidatePath(`/works/diary/${workId}`);
      revalidatePath(`/works/tasks/${workId}`);
    }
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
} // <-- EZ HIÁNYZOTT

/**
 * Create a new WorkDiaryItem entry
 */
export async function createWorkDiaryItem({
  diaryId,
  workId,
  workItemId,
  workerId,
  email,
  name,
  workItemWorkerId,
  date,
  quantity,
  unit,
  workHours,
  images,
  notes,
  accepted,
}: {
  diaryId: number;
  workId: number;
  workItemId: number;
  workerId?: number;
  email?: string;
  name?: string;
  workItemWorkerId?: number;
  date?: Date;
  quantity?: number;
  unit?: string;
  workHours?: number;
  images?: string[];
  notes?: string;
  accepted?: boolean;
  // id is intentionally omitted for creation
}) {
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

  try {
    // Determine worker email either from explicit email or from workItemWorker assignment
    let effectiveWorkerEmail: string | undefined = email;
    if (!effectiveWorkerEmail && workItemWorkerId) {
      effectiveWorkerEmail =
        await getWorkerEmailFromAssignment(workItemWorkerId);
    }
    const tenantEmail = await resolveTenantEmail(
      userEmail,
      effectiveWorkerEmail
    );
    const createData: any = {
      diaryId,
      workId,
      workItemId,
      tenantEmail,
    };
    if (workerId !== undefined) createData.workerId = workerId;
    if (email !== undefined) createData.email = email;
    if (name !== undefined) createData.name = name;
    if (workItemWorkerId !== undefined)
      createData.workItemWorkerId = workItemWorkerId;
    if (date !== undefined) createData.date = date;
    if (quantity !== undefined) createData.quantity = quantity;
    if (unit !== undefined) createData.unit = unit;
    if (workHours !== undefined) createData.workHours = workHours;
    if (images !== undefined) createData.images = images;
    if (notes !== undefined) createData.notes = notes;
    if (typeof accepted === "boolean") createData.accepted = accepted;

    // No same-day per workItem restriction: allow multiple entries on the same day for the same workItem
    try {
      console.log("[workdiary-actions] createWorkDiaryItem input", {
        diaryId,
        workId,
        workItemId,
        workerId,
        name,
        email,
        workItemWorkerId,
      });
      console.log(
        "[workdiary-actions] createWorkDiaryItem createData",
        createData
      );
    } catch {}
    const created = await prisma.workDiaryItem.create({
      data: createData,
    });
    if (workId) {
      revalidatePath(`/works/diary/${workId}`);
      revalidatePath(`/works/tasks/${workId}`);
    }
    return { success: true, data: created };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function createWorkDiary({
  workId,
  workItemId,
}: {
  workId: number;
  workItemId?: number;
}) {
  const { user, tenantEmail: loggedEmail } = await getTenantSafeAuth();
  // No explicit worker email here, resolve based on the logged-in account.
  const tenantEmail = await resolveTenantEmail(loggedEmail);

  const existing = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (existing) {
    return { success: false, message: "Diary already exists for this work." };
  }

  const createData: any = {
    workId,
    tenantEmail,
    date: new Date(),
    description: "",
  };
  if (workItemId) {
    createData.workItemId = workItemId;
  }

  const diary = await prisma.workDiary.create({
    data: createData,
  });

  if (workItemId) {
    await prisma.workItem.update({
      where: { id: workItemId },
      data: { inProgress: true },
    });
  }

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}

// Non-failing alternative used by UI flows that just need a diary id.
// If a diary exists for (workId, tenantEmail), return it as success.
// Otherwise create it and return the new one.
export async function getOrCreateWorkDiaryForWork({
  workId,
  workItemId,
}: {
  workId: number;
  workItemId?: number;
}) {
  const { user, tenantEmail: loggedEmail } = await getTenantSafeAuth();
  const tenantEmail = await resolveTenantEmail(loggedEmail);

  const existing = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (existing) {
    try {
      console.log("[workdiary-actions] getOrCreateWorkDiaryForWork: existing", {
        workId,
        tenantEmail,
        existingId: existing.id,
      });
    } catch {}
    return { success: true, data: existing };
  }

  const createData: any = {
    workId,
    tenantEmail,
    date: new Date(),
    description: "",
  };
  if (workItemId) {
    createData.workItemId = workItemId;
  }

  const diary = await prisma.workDiary.create({
    data: createData,
  });
  
  // Keep cache fresh on creation
  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}
