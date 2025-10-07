"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import { getCurrentSalary } from "@/utils/salary-helper";

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

export async function deleteWorkDiaryItem({ id }: { id: number }) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  // Get workItemId before deletion
  const diaryItem = await prisma.workDiaryItem.findUnique({
    where: { id },
    select: { workItemId: true }
  });

  await prisma.workDiaryItem.delete({ where: { id } });

  // Update WorkItem completedQuantity after deletion
  if (diaryItem?.workItemId) {
    await updateWorkItemCompletedQuantityFromLatestDiary(diaryItem.workItemId);
  }

  revalidatePath(`/works/diary`);
  return { success: true };
}

export async function deleteWorkDiaryItemsByGroup({
  groupNo,
}: {
  groupNo: number;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  // Get affected workItemIds before deletion
  const affectedItems = await prisma.workDiaryItem.findMany({
    where: {
      groupNo,
      tenantEmail,
    },
    select: { workItemId: true },
    distinct: ['workItemId']
  });

  await prisma.workDiaryItem.deleteMany({
    where: {
      groupNo,
      tenantEmail,
    },
  });

  // Update WorkItem completedQuantity for all affected workItems
  for (const item of affectedItems) {
    await updateWorkItemCompletedQuantityFromLatestDiary(item.workItemId);
  }

  revalidatePath(`/works/diary`);
  return { success: true };
}

export async function deleteWorkDiary({
  workId,
  workItemId,
}: {
  workId: number;
  workItemId?: number | null;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const diary = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found for this task." };
  }

  await prisma.workDiary.delete({ where: { id: diary.id } });

  if (workItemId) {
    if (await prisma.workItem.findUnique({ where: { id: workItemId } })) {
      await prisma.workItem.update({
        where: { id: workItemId },
        data: { inProgress: false },
      });
    }
  }

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true };
}

export async function updateWorkDiary({
  id,
  workId,
  workItemId,
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
  workItemId?: number;
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
    where: { id, workId, workItemId, tenantEmail },
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

  // Automatikus workforceRegistryId és dailyRateSnapshot frissítés ha a név vagy dátum változott
  if ((name !== undefined || date !== undefined) && (!updateData.dailyRateSnapshot || !updateData.workforceRegistryId)) {
    try {
      // Lekérjük a jelenlegi bejegyzést
      const currentItem = await prisma.workDiaryItem.findUnique({
        where: { id },
        select: { name: true, date: true, tenantEmail: true, workforceRegistryId: true }
      });
      
      if (currentItem) {
        const workerName = name !== undefined ? name : currentItem.name;
        const itemDate = date !== undefined ? date : currentItem.date;
        const tenantEmail = updateData.tenantEmail || currentItem.tenantEmail;
        
        if (workerName) {
          // Keressük meg a munkást a WorkforceRegistry-ben
          const workforceWorker = await prisma.workforceRegistry.findFirst({
            where: {
              name: { equals: workerName, mode: 'insensitive' },
              tenantEmail
            }
          });
          
          if (workforceWorker) {
            // Mentjük a workforceRegistryId-t (ha még nincs vagy változott a név)
            if (!currentItem.workforceRegistryId || name !== undefined) {
              updateData.workforceRegistryId = workforceWorker.id;
            }
            
            // Lekérjük az aktuális fizetést a napló dátumára (ha még nincs vagy változott)
            if (!updateData.dailyRateSnapshot) {
              const currentSalary = await getCurrentSalary(workforceWorker.id, itemDate);
              updateData.dailyRateSnapshot = currentSalary;
            }
            
            try {
              console.log("[workdiary-actions] WorkforceRegistry data updated", {
                itemId: id,
                workerName,
                workforceRegistryId: workforceWorker.id,
                itemDate,
                dailyRateSnapshot: updateData.dailyRateSnapshot
              });
            } catch {}
          }
        }
      }
    } catch (error) {
      // Ha hiba van a lekérésnél, nem blokkoljuk a napló frissítést
      console.error("[workdiary-actions] Error updating workforce registry data:", error);
    }
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
  groupNo,
  progressAtDate,
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
  groupNo?: number;
  progressAtDate?: number;
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
    if (groupNo !== undefined) createData.groupNo = groupNo;
    if (progressAtDate !== undefined) createData.progressAtDate = progressAtDate;

    // Automatikus workforceRegistryId és dailyRateSnapshot mentés
    if (name && (!createData.dailyRateSnapshot || !createData.workforceRegistryId)) {
      try {
        // Keressük meg a munkást a WorkforceRegistry-ben név alapján
        const workforceWorker = await prisma.workforceRegistry.findFirst({
          where: {
            name: { equals: name, mode: 'insensitive' },
            tenantEmail
          }
        });
        
        if (workforceWorker) {
          // Mentjük a workforceRegistryId-t
          createData.workforceRegistryId = workforceWorker.id;
          
          // Lekérjük az aktuális fizetést a napló dátumára (ha még nincs)
          if (!createData.dailyRateSnapshot) {
            const diaryDate = date || new Date();
            const currentSalary = await getCurrentSalary(workforceWorker.id, diaryDate);
            createData.dailyRateSnapshot = currentSalary;
          }
          
          try {
            console.log("[workdiary-actions] WorkforceRegistry data added", {
              workerName: name,
              workforceRegistryId: workforceWorker.id,
              diaryDate: date || new Date(),
              dailyRateSnapshot: createData.dailyRateSnapshot
            });
          } catch {}
        }
      } catch (error) {
        // Ha hiba van a lekérésnél, nem blokkoljuk a napló mentést
        console.error("[workdiary-actions] Error getting workforce registry data:", error);
      }
    }

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
  workItemId: number;
}) {
  const { user, tenantEmail: loggedEmail } = await getTenantSafeAuth();
  // No explicit worker email here, resolve based on the logged-in account.
  const tenantEmail = await resolveTenantEmail(loggedEmail);

  // Check for existing diary by workId only (1:1 relationship with Work)
  const existing = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (existing) {
    return { success: true, data: existing };
  }

  const diary = await prisma.workDiary.create({
    data: {
      workId,
      workItemId,
      tenantEmail,
      date: new Date(),
      description: "",
    },
  });

  await prisma.workItem.update({
    where: { id: workItemId },
    data: { inProgress: true },
  });

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}

// Non-failing alternative used by UI flows that just need a diary id.
// Since WorkDiary has 1:1 relationship with Work (unique workId), check for existing by workId only.
// If a diary exists for (workId, tenantEmail), return it as success.
// Otherwise create it and return the new one.
export async function getOrCreateWorkDiaryForTask({
  workId,
  workItemId,
}: {
  workId: number;
  workItemId: number;
}) {
  const { user, tenantEmail: loggedEmail } = await getTenantSafeAuth();
  const tenantEmail = await resolveTenantEmail(loggedEmail);

  // Check for existing diary by workId only (1:1 relationship with Work)
  const existing = await prisma.workDiary.findFirst({
    where: { workId, tenantEmail },
  });
  if (existing) {
    try {
      console.log("[workdiary-actions] getOrCreateWorkDiaryForTask: existing", {
        workId,
        workItemId,
        tenantEmail,
        existingId: existing.id,
      });
    } catch {}
    return { success: true, data: existing };
  }

  const diary = await prisma.workDiary.create({
    data: {
      workId,
      workItemId,
      tenantEmail,
      date: new Date(),
      description: "",
    },
  });
  // Keep cache fresh on creation
  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}

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

// Update WorkItem completedQuantity based on latest diary entry progressAtDate
export async function updateWorkItemCompletedQuantityFromLatestDiary(workItemId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    // Find the latest diary entry for this workItem (only up to today)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const latestDiaryEntry = await prisma.workDiaryItem.findFirst({
      where: {
        workItemId: workItemId,
        tenantEmail: tenantEmail,
        date: { lte: today }, // Only entries up to today
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        progressAtDate: true
      }
    });

    // Get workItem quantity for progress calculation
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { quantity: true }
    });

    // Update WorkItem completedQuantity
    const completedQuantity = latestDiaryEntry?.progressAtDate || 0;
    const progress = completedQuantity > 0 && workItem?.quantity ? 
      Math.floor((completedQuantity / workItem.quantity) * 100) : 0;
    
    await prisma.workItem.update({
      where: {
        id: workItemId,
        tenantEmail: tenantEmail,
      },
      data: {
        completedQuantity: completedQuantity,
        progress: progress,
      }
    });

    revalidatePath('/works/tasks');
    return { success: true, completedQuantity };
  } catch (error) {
    console.error('Error updating WorkItem completedQuantity:', error);
    return { success: false, error: 'Failed to update WorkItem completedQuantity' };
  }
}

// Get slider initial value: check for previous diary entry up to selected date
export async function getSliderInitialValue(workItemId: number, selectedDate: string, completedQuantity: number) {
  console.log(`🔍 [getSliderInitialValue] START - workItemId: ${workItemId}, selectedDate: ${selectedDate}, completedQuantity: ${completedQuantity}`);
  
  try {
    // If no date provided, return completedQuantity
    if (!selectedDate || selectedDate.trim() === '') {
      console.log(`📅 [getSliderInitialValue] No date provided, using completedQuantity: ${completedQuantity}`);
      return completedQuantity;
    }

    const { tenantEmail } = await getTenantSafeAuth();
    
    // Parse date safely
    let parsedDate: Date;
    try {
      parsedDate = new Date(selectedDate);
      if (isNaN(parsedDate.getTime())) {
        console.log(`❌ [getSliderInitialValue] Invalid date, using completedQuantity: ${completedQuantity}`);
        return completedQuantity;
      }
    } catch {
      console.log(`❌ [getSliderInitialValue] Date parse error, using completedQuantity: ${completedQuantity}`);
      return completedQuantity;
    }

    console.log(`🔎 [getSliderInitialValue] Searching for entries up to: ${parsedDate.toISOString()}`);

    // Find latest diary entry up to selected date
    const previousEntry = await prisma.workDiaryItem.findFirst({
      where: {
        workItemId: workItemId,
        tenantEmail: tenantEmail,
        date: { lte: parsedDate }
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        progressAtDate: true,
        date: true
      }
    });

    if (previousEntry) {
      console.log(`✅ [getSliderInitialValue] Found previous entry - date: ${previousEntry.date}, progressAtDate: ${previousEntry.progressAtDate}`);
      return previousEntry.progressAtDate ?? completedQuantity;
    } else {
      console.log(`❌ [getSliderInitialValue] No previous entry found, using completedQuantity: ${completedQuantity}`);
      return completedQuantity;
    }
    
  } catch (error) {
    console.error('❌ [getSliderInitialValue] Error:', error);
    console.log(`🔄 [getSliderInitialValue] Fallback to completedQuantity: ${completedQuantity}`);
    return completedQuantity;
  }
}
