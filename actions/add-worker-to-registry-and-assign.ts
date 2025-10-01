"use server";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

export interface AddWorkerToRegistryAndAssignParams {
  workId: number;
  workItemId: number | null;
  name: string;
  email: string;
  phone: string;
  profession: string;
  quantity?: number;
  avatarUrl?: string;
  dailyRate?: number; // Optional, csak új munkásnál van
}

export async function addWorkerToRegistryAndAssign(
  params: AddWorkerToRegistryAndAssignParams
) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const {
    workId,
    workItemId,
    name,
    email,
    phone,
    profession,
    quantity = 1,
    avatarUrl,
    dailyRate,
  } = params;

  try {
    // Tranzakcióba foglaljuk az összes műveletet
    const result = await prisma.$transaction(async (tx) => {
      // 0. Check if a worker with this name already exists in any workItemWorker for this work
      const existingWorkerWithSameName = await tx.workItemWorker.findFirst({
        where: {
          workId: workId,
          name: name,
          tenantEmail: tenantEmail,
        },
      });

      if (existingWorkerWithSameName) {
        throw new Error(`Már dolgozik ${name} nevű munkás ezen a munkán. Nem lehet ugyanazzal a névvel újat regisztrálni.`);
      }

      // 1. Check if worker already exists in workforce registry by name (case insensitive)
      let existingWorkerInRegistry = await tx.workforceRegistry.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          tenantEmail: tenantEmail,
        },
      });

      let newWorker;
      if (existingWorkerInRegistry) {
        // Ha meglévő munkás és nincs dailyRate megadva, használjuk a meglévőt
        if (dailyRate === undefined) {
          // Ha van új avatarUrl, frissítsük a workforceRegistry-ben is
          if (avatarUrl && avatarUrl !== existingWorkerInRegistry.avatarUrl) {
            newWorker = await tx.workforceRegistry.update({
              where: { id: existingWorkerInRegistry.id },
              data: { avatarUrl },
            });
          } else {
            newWorker = existingWorkerInRegistry;
          }
        } else {
          // Ha dailyRate meg van adva, akkor új munkás próbál létrejönni ugyanazzal a névvel
          throw new Error(`${name} nevű munkás már regisztrálva van a rendszerben!`);
        }
      } else {
        // Új munkás létrehozása - dailyRate kötelező
        if (dailyRate === undefined) {
          throw new Error("Új munkásnál kötelező megadni a napi díjat!");
        }
        
        newWorker = await tx.workforceRegistry.create({
          data: {
            name,
            email,
            phone,
            role: profession,
            avatarUrl,
            dailyRate,
            tenantEmail,
          },
        });
      }

      // 2. Find or create Worker record for this profession
      let worker = await tx.worker.findFirst({
        where: {
          workId,
          name: profession,
          tenantEmail,
        },
      });

      if (!worker) {
        // Create new Worker record for this profession
        const initialWorkerEntry = {
          workforceRegistryId: newWorker.id,
          name,
          email,
          phone,
          profession,
          avatarUrl,
        };

        worker = await tx.worker.create({
          data: {
            workId,
            workItemId: workItemId, // Link to the workItem (can be null for general workers)
            name: profession,
            role: profession,
            tenantEmail,
            workers: JSON.stringify([initialWorkerEntry]), // Initialize with the current worker
          },
        });
      }

      // 3. Add to workItemWorkers table using the Worker record ID
      const workItemWorker = await tx.workItemWorker.create({
        data: {
          workId: workId, // Add workId for general workers support
          workItemId: workItemId,
          workerId: worker.id, // Use Worker record ID, not WorkforceRegistry ID
          workforceRegistryId: newWorker.id, // Reference to WorkforceRegistry
          name,
          email,
          phone,
          role: profession,
          quantity,
          avatarUrl,
          tenantEmail,
        },
      });

      // 4. Update Worker.workers JSON array (always update, even for new workers)
      const existingWorkersString = worker.workers as string;
      let workersArray: any[] = [];
      
      try {
        workersArray = existingWorkersString ? JSON.parse(existingWorkersString) : [];
      } catch (e) {
        workersArray = [];
      }
      
      // Check if this worker entry already exists
      const existingWorkerIndex = workersArray.findIndex(w => w.workforceRegistryId === newWorker.id);
      
      if (existingWorkerIndex === -1) {
        // Add new worker entry to the array
        workersArray.push({
          workforceRegistryId: newWorker.id,
          name,
          email,
          phone,
          profession,
          avatarUrl,
        });
      } else {
        // Update existing worker entry (especially avatarUrl)
        workersArray[existingWorkerIndex] = {
          ...workersArray[existingWorkerIndex],
          name,
          email,
          phone,
          profession,
          avatarUrl,
        };
      }

      // Always update Worker.workers JSON array
      await tx.worker.update({
        where: {
          id: worker.id,
        },
        data: {
          workers: JSON.stringify(workersArray),
        },
      });

      return { worker: newWorker, workItemWorker };
    });

    // Revalidate the supply page to refresh data (outside transaction)
    revalidatePath(`/supply/${workId}`);

    return result;
  } catch (error) {
    console.error("Error adding worker to registry and assigning:", error);
    // Re-throw the original error to preserve the specific message
    throw error;
  }
}
