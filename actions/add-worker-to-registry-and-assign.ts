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
  } = params;

  try {
    // 0. Check if a worker with this name already exists in any workItemWorker for this work
    const existingWorkerWithSameName = await prisma.workItemWorker.findFirst({
      where: {
        workId: workId,
        name: name,
        tenantEmail: tenantEmail,
      },
    });

    if (existingWorkerWithSameName) {
      throw new Error(`Már dolgozik ${name} nevű munkás ezen a munkán. Nem lehet ugyanazzal a névvel újat regisztrálni.`);
    }

    // 1. Add worker to workforce registry
    const newWorker = await prisma.workforceRegistry.create({
      data: {
        name,
        email,
        phone,
        role: profession,
        avatarUrl,
        tenantEmail,
      },
    });

    // 2. Find or create Worker record for this profession first
    let worker = await prisma.worker.findFirst({
      where: {
        workId,
        name: profession,
        tenantEmail,
      },
    });

    if (!worker) {
      // Create new Worker record for this profession with the first worker entry
      const initialWorkerEntry = {
        workforceRegistryId: newWorker.id,
        name,
        email,
        phone,
        profession,
        avatarUrl,
      };

      worker = await prisma.worker.create({
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
    const workItemWorker = await prisma.workItemWorker.create({
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
    
    // Check if this worker entry already exists to avoid duplicates
    const workerExists = workersArray.some(w => w.workforceRegistryId === newWorker.id);
    
    if (!workerExists) {
      // Add new worker entry to the array
      workersArray.push({
        workforceRegistryId: newWorker.id,
        name,
        email,
        phone,
        profession,
        avatarUrl,
      });

      // Update Worker.workers JSON array
      await prisma.worker.update({
        where: {
          id: worker.id,
        },
        data: {
          workers: JSON.stringify(workersArray),
        },
      });
    }

    // Revalidate the supply page to refresh data
    revalidatePath(`/supply/${workId}`);

    return { worker: newWorker, workItemWorker };
  } catch (error) {
    console.error("Error adding worker to registry and assigning:", error);
    throw new Error("Failed to add worker to registry and assign to work item");
  }
}
