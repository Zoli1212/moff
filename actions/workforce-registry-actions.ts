"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

export interface WorkforceRegistryData {
  id?: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  contactInfo: string | null;
  hiredDate: Date | null;
  leftDate: Date | null;
  isActive: boolean;
  isDeleted: boolean;
  isRestricted: boolean;
  notes: string | null;
  avatarUrl: string | null;
  dailyRate: number | null;
}

// Get all workforce registry entries for current tenant
export async function getAllWorkforceRegistry() {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    const workforceEntries = await prisma.workforceRegistry.findMany({
      where: {
        tenantEmail: tenantEmail,
        isDeleted: false, // Ne jelenítse meg a törölt munkásokat
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return workforceEntries;
  } catch (error) {
    console.error("Error fetching workforce registry:", error);
    throw new Error("Hiba a munkásregiszter lekérése során");
  }
}

// Create new workforce registry entry
export async function createWorkforceRegistry(
  data: Omit<WorkforceRegistryData, "id">
) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Check if a worker with the same name already exists for this tenant
    const existingWorker = await prisma.workforceRegistry.findFirst({
      where: {
        name: data.name.trim(),
        tenantEmail: tenantEmail,
      },
    });

    if (existingWorker) {
      return {
        success: false,
        error:
          "Van már ilyen nevű munkás a regiszterben!\nAdj hozzá becenevet is (pl. Nagy Péter 2, Nagy Péter ifj.)",
      };
    }

    const newEntry = await prisma.workforceRegistry.create({
      data: {
        ...data,
        name: data.name.trim(), // Ensure trimmed name
        tenantEmail: tenantEmail,
      },
    });

    revalidatePath("/others");
    return { success: true, data: newEntry };
  } catch (error) {
    console.error("Error creating workforce registry entry:", error);
    return { success: false, error: "Hiba a munkás hozzáadása során" };
  }
}

// Update workforce registry entry
export async function updateWorkforceRegistry(
  id: number,
  data: Partial<WorkforceRegistryData>
) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Verify ownership
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        error: "Munkás nem található vagy nincs jogosultság",
      };
    }

    // Check if name is being updated and if it conflicts with existing names
    if (data.name && data.name.trim() !== existingEntry.name) {
      const nameConflict = await prisma.workforceRegistry.findFirst({
        where: {
          name: data.name.trim(),
          tenantEmail: tenantEmail,
          id: { not: id }, // Exclude current entry
        },
      });

      if (nameConflict) {
        return {
          success: false,
          error:
            "Van már ilyen nevű munkás a regiszterben!\nAdj hozzá becenevet is (pl. Nagy Péter 2, Nagy Péter ifj.)",
        };
      }
    }

    // Trim name if provided
    const updateData = data.name ? { ...data, name: data.name.trim() } : data;

    const updatedEntry = await prisma.workforceRegistry.update({
      where: { id: id },
      data: updateData,
    });

    // Ha bármilyen releváns adat változott, frissítsük a kapcsolódó WorkItemWorker rekordokat is
    if (data.name || data.email !== undefined || data.phone !== undefined || data.avatarUrl !== undefined || data.role) {
      await prisma.workItemWorker.updateMany({
        where: {
          workforceRegistryId: id,
          tenantEmail: tenantEmail,
        },
        data: {
          // Frissítsük a nevet, ha változott
          ...(data.name && { name: data.name.trim() }),
          // Frissítsük az email-t, ha változott
          ...(data.email !== undefined && { email: data.email }),
          // Frissítsük a telefont, ha változott
          ...(data.phone !== undefined && { phone: data.phone }),
          // Frissítsük az avatarUrl-t, ha változott
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
          // Frissítsük a szerepkört, ha változott
          ...(data.role && { role: data.role }),
        },
      });

      // Frissítsük a kapcsolódó WorkDiaryItem rekordokat is workforceRegistryId alapján
      await prisma.workDiaryItem.updateMany({
        where: {
          workforceRegistryId: id,
          tenantEmail: tenantEmail,
        },
        data: {
          // Frissítsük a nevet, ha változott
          ...(data.name && { name: data.name.trim() }),
        },
      });
    }

    revalidatePath("/others");
    revalidatePath("/works"); // Frissítsük a munkák oldalt is, mert ott jelennek meg a WorkItemWorker adatok
    revalidatePath("/diary"); // Frissítsük a napló oldalakat is, mert ott jelennek meg a WorkDiaryItem adatok
    return { success: true, data: updatedEntry };
  } catch (error) {
    console.error("Error updating workforce registry entry:", error);
    return { success: false, error: "Hiba a munkás frissítése során" };
  }
}

// Delete workforce registry entry
export async function deleteWorkforceRegistry(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Verify ownership
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        error: "Munkás nem található vagy nincs jogosultság",
      };
    }

    // Step 1: Check if workforceRegistry.id exists in workItemWorker.workforceRegistryId
    const workItemAssignments = await prisma.workItemWorker.findMany({
      where: {
        workforceRegistryId: existingEntry.id,
        tenantEmail: tenantEmail,
      },
      include: {
        workItem: {
          include: {
            work: true,
          },
        },
      },
    });

    console.log("[DEBUG] Worker:", existingEntry.name, "ID:", existingEntry.id);
    console.log(
      "[DEBUG] Found workItemAssignments:",
      workItemAssignments.length
    );
    console.log(
      "[DEBUG] WorkItemWorker IDs:",
      workItemAssignments.map((a) => a.id)
    );

    // Step 2: Check diary entries - first by workItemWorkerId, then by name
    let totalDiaryEntries = 0;
    let diaryEntriesByWorkItemWorker: any[] = [];
    let diaryEntriesByName: any[] = [];

    // First: Check by workItemWorkerId (new entries)
    if (workItemAssignments.length > 0) {
      const workItemWorkerIds = workItemAssignments.map(
        (assignment) => assignment.id
      );

      diaryEntriesByWorkItemWorker = await prisma.workDiaryItem.findMany({
        where: {
          workItemWorkerId: {
            in: workItemWorkerIds,
          },
          tenantEmail: tenantEmail,
        },
      });

      console.log(
        "[DEBUG] Diary entries found by workItemWorkerId:",
        diaryEntriesByWorkItemWorker
      );
    }

    // Second: Check by name (legacy entries)
    diaryEntriesByName = await prisma.workDiaryItem.findMany({
      where: {
        name: existingEntry.name,
        tenantEmail: tenantEmail,
      },
    });

    console.log("[DEBUG] Diary entries found by name:", diaryEntriesByName);

    // Combine both results (avoid duplicates)
    const allDiaryEntryIds = new Set([
      ...diaryEntriesByWorkItemWorker.map((d) => d.id),
      ...diaryEntriesByName.map((d) => d.id),
    ]);

    totalDiaryEntries = allDiaryEntryIds.size;

    console.log("[DEBUG] Total diaryEntries:", totalDiaryEntries);

    // Check if worker is on any pending works
    const pendingWorks = workItemAssignments.filter(
      (assignment) => assignment.workItem?.work?.status === "pending"
    );

    if (
      workItemAssignments.length > 0 ||
      totalDiaryEntries > 0 ||
      pendingWorks.length > 0
    ) {
      return {
        success: false,
        error: "Munkafázison dolgozik! Előbb töröld ki onnan.",
        needsCleanup: true,
        workItemAssignments: workItemAssignments.map((a) => ({
          id: a.id,
          workItemName: a.workItem?.name,
          workName: a.workItem?.work?.title,
        })),
        diaryEntriesCount: totalDiaryEntries,
      };
    }

    await prisma.workforceRegistry.delete({
      where: { id: id },
    });

    revalidatePath("/others");
    return { success: true };
  } catch (error) {
    console.error("Error deleting workforce registry entry:", error);
    return { success: false, error: "Hiba a munkás törlése során" };
  }
}

// Clean up worker assignments and then delete from registry
export async function cleanupAndDeleteWorkforceRegistry(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Verify ownership
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        error: "Munkás nem található vagy nincs jogosultság",
      };
    }

    // Delete all workDiaryItems for this worker - both by workItemWorker connection and by name
    // First: Get all workItemWorker IDs for this workforce registry BEFORE deleting them
    const workItemWorkers = await prisma.workItemWorker.findMany({
      where: {
        workforceRegistryId: existingEntry.id,
        tenantEmail: tenantEmail,
      },
      select: { id: true },
    });

    // Delete diary entries by workItemWorkerId (new entries)
    if (workItemWorkers.length > 0) {
      const workItemWorkerIds = workItemWorkers.map((w) => w.id);

      await prisma.workDiaryItem.deleteMany({
        where: {
          workItemWorkerId: {
            in: workItemWorkerIds,
          },
          tenantEmail: tenantEmail,
        },
      });
    }

    // Delete diary entries by name (legacy entries)
    await prisma.workDiaryItem.deleteMany({
      where: {
        name: existingEntry.name,
        tenantEmail: tenantEmail,
      },
    });

    // NOW delete all workItemWorker assignments for this worker
    await prisma.workItemWorker.deleteMany({
      where: {
        workforceRegistryId: existingEntry.id,
        tenantEmail: tenantEmail,
      },
    });

    // Remove worker from Worker.workers JSON arrays
    const workersWithThisName = await prisma.worker.findMany({
      where: {
        tenantEmail: tenantEmail,
      },
    });

    for (const worker of workersWithThisName) {
      const updatedWorkers = (worker.workers as any[]).filter(
        (w) => w.name !== existingEntry.name
      );
      await prisma.worker.update({
        where: { id: worker.id },
        data: { workers: updatedWorkers },
      });
    }

    // Finally delete from workforce registry
    await prisma.workforceRegistry.delete({
      where: { id: id },
    });

    revalidatePath("/others");
    revalidatePath("/works");
    return { success: true };
  } catch (error) {
    console.error(
      "Error cleaning up and deleting workforce registry entry:",
      error
    );
    return { success: false, error: "Hiba a munkás törlése során" };
  }
}

// Toggle active status
export async function toggleWorkforceRegistryActive(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Get current entry
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        error: "Munkás nem található vagy nincs jogosultság",
      };
    }

    const updatedEntry = await prisma.workforceRegistry.update({
      where: { id: id },
      data: {
        isActive: !existingEntry.isActive,
      },
    });

    revalidatePath("/others");
    return { success: true, data: updatedEntry };
  } catch (error) {
    console.error("Error toggling workforce registry active status:", error);
    return { success: false, error: "Hiba az aktív státusz módosítása során" };
  }
}

// Toggle restricted status
export async function toggleWorkforceRegistryRestricted(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Get current entry
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        error: "Munkás nem található vagy nincs jogosultság",
      };
    }

    const updatedEntry = await prisma.workforceRegistry.update({
      where: { id: id },
      data: {
        isRestricted: !existingEntry.isRestricted,
      },
    });

    revalidatePath("/others");
    revalidatePath("/diary");
    return { success: true, data: updatedEntry };
  } catch (error) {
    console.error("Error toggling workforce registry restricted status:", error);
    return { success: false, error: "Hiba a korlátozás módosítása során" };
  }
}

// Get worker restriction status (tenant-safe)
export async function getWorkerRestrictionStatus() {
  try {
    const { user, tenantEmail, originalUserEmail } = await getTenantSafeAuth();

    if (!originalUserEmail) {
      return { isRestricted: false };
    }

    // Step 1: Find worker by email (any tenant)
    const worker = await prisma.workforceRegistry.findFirst({
      where: {
        email: originalUserEmail,
      },
    });

    if (!worker) {
      return { isRestricted: false };
    }

    // Step 2: Return the worker's isRestricted status
    return {
      isRestricted: worker.isRestricted ?? false,
    };
  } catch (error) {
    console.error("Error getting worker restriction status:", error);
    return { isRestricted: false };
  }
}

// Remove single workItemWorker assignment
export async function removeWorkItemWorkerAssignment(assignmentId: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // First remove any diary entries for this workItemWorker
    await prisma.workDiaryItem.deleteMany({
      where: {
        workItemWorkerId: assignmentId,
        tenantEmail: tenantEmail,
      },
    });

    // Then remove the workItemWorker assignment
    await prisma.workItemWorker.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/others");
    revalidatePath("/works");
    return { success: true };
  } catch (error) {
    console.error("Error removing workItemWorker assignment:", error);
    return {
      success: false,
      error: "Hiba a munkafázis hozzárendelés törlése során",
    };
  }
}

// Remove all diary entries for a worker
export async function removeWorkerDiaryEntries(workerId: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Get the worker name for legacy diary entries
    const worker = await prisma.workforceRegistry.findFirst({
      where: { id: workerId, tenantEmail: tenantEmail },
    });

    if (!worker) {
      return { success: false, error: "Munkás nem található" };
    }

    // Step 1: Get all workItemWorker IDs for this workforce registry
    const workItemWorkers = await prisma.workItemWorker.findMany({
      where: {
        workforceRegistryId: workerId,
        tenantEmail: tenantEmail,
      },
      select: { id: true },
    });

    // Step 2: Delete diary entries by workItemWorkerId (new entries)
    if (workItemWorkers.length > 0) {
      const workItemWorkerIds = workItemWorkers.map((w) => w.id);

      await prisma.workDiaryItem.deleteMany({
        where: {
          workItemWorkerId: {
            in: workItemWorkerIds,
          },
          tenantEmail: tenantEmail,
        },
      });
    }

    // Step 3: Delete diary entries by name (legacy entries)
    await prisma.workDiaryItem.deleteMany({
      where: {
        name: worker.name,
        tenantEmail: tenantEmail,
      },
    });

    revalidatePath("/others");
    revalidatePath("/works");
    return { success: true };
  } catch (error) {
    console.error("Error removing worker diary entries:", error);
    return { success: false, error: "Hiba a napló bejegyzések törlése során" };
  }
}

// Remove worker from registry only (final step) - LOGICAL DELETE
export async function removeWorkerFromRegistryOnly(workerId: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Check if worker still has any connections
    const worker = await prisma.workforceRegistry.findFirst({
      where: { id: workerId, tenantEmail: tenantEmail },
    });

    if (!worker) {
      return { success: false, error: "Munkás nem található" };
    }

    // Check for remaining connections
    const workItemAssignments = await prisma.workItemWorker.findMany({
      where: {
        workforceRegistryId: workerId,
        tenantEmail: tenantEmail,
      },
    });

    // Check for diary entries - both by workItemWorker connection and by name (legacy)
    let diaryEntriesCount = 0;
    let diaryEntriesByWorkItemWorker: any[] = [];
    let diaryEntriesByName: any[] = [];

    // First: Check by workItemWorkerId (new entries)
    if (workItemAssignments.length > 0) {
      const workItemWorkerIds = workItemAssignments.map((w) => w.id);

      diaryEntriesByWorkItemWorker = await prisma.workDiaryItem.findMany({
        where: {
          workItemWorkerId: {
            in: workItemWorkerIds,
          },
          tenantEmail: tenantEmail,
        },
      });
    }

    // Second: Check by name (legacy entries)
    diaryEntriesByName = await prisma.workDiaryItem.findMany({
      where: {
        name: worker.name,
        tenantEmail: tenantEmail,
      },
    });

    // Combine both results (avoid duplicates)
    const allDiaryEntryIds = new Set([
      ...diaryEntriesByWorkItemWorker.map((d) => d.id),
      ...diaryEntriesByName.map((d) => d.id),
    ]);

    diaryEntriesCount = allDiaryEntryIds.size;

    if (workItemAssignments.length > 0 || diaryEntriesCount > 0) {
      return {
        success: false,
        error: "Még vannak aktív kapcsolatok! Először távolítsa el azokat.",
      };
    }

    // LOGICAL DELETE - set isDeleted to true instead of physical delete
    await prisma.workforceRegistry.update({
      where: { id: workerId },
      data: { isDeleted: true },
    });

    revalidatePath("/others");
    return { success: true };
  } catch (error) {
    console.error("Error deactivating worker in registry:", error);
    return { success: false, error: "Hiba a munkás deaktiválása során" };
  }
}
