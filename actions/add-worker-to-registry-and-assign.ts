"use server";
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

export interface AddWorkerToRegistryAndAssignParams {
  workId: number;
  workItemId: number;
  name: string;
  email: string;
  phone: string;
  profession: string;
  quantity?: number;
  avatarUrl?: string;
}

export async function addWorkerToRegistryAndAssign(params: AddWorkerToRegistryAndAssignParams) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const tenantEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) {
    throw new Error("Tenant email not found");
  }

  const {
    workId,
    workItemId,
    name,
    email,
    phone,
    profession,
    quantity = 1,
    avatarUrl
  } = params;

  try {
    // 1. Add worker to workforce registry
    const newWorker = await prisma.workforceRegistry.create({
      data: {
        name,
        email,
        phone,
        role: profession,
        avatarUrl,
        tenantEmail,
      }
    });

    // 2. Find or create Worker record for this profession first
    let worker = await prisma.worker.findFirst({
      where: {
        workId,
        name: profession,
        tenantEmail,
      }
    });

    if (!worker) {
      // Create new Worker record for this profession
      worker = await prisma.worker.create({
        data: {
          workId,
          workItemId: workItemId, // Link to the workItem
          name: profession,
          role: profession,
          tenantEmail,
          workers: JSON.stringify([]), // Initialize empty workers array
        }
      });
    }

    // 3. Add to workItemWorkers table using the Worker record ID
    const workItemWorker = await prisma.workItemWorker.create({
      data: {
        workItemId,
        workerId: worker.id, // Use Worker record ID, not WorkforceRegistry ID
        workforceRegistryId: newWorker.id, // Reference to WorkforceRegistry
        name,
        email,
        phone,
        role: profession,
        quantity,
        avatarUrl,
        tenantEmail,
      }
    });

    // 4. Update Worker.workers JSON array
    // Parse existing workers array from Worker.workers JSON
    let workersArray: any[] = [];
    try {
      workersArray = worker.workers ? JSON.parse(worker.workers as string) : [];
    } catch (e) {
      workersArray = [];
    }

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
      }
    });

    // Revalidate the supply page to refresh data
    revalidatePath(`/supply/${workId}`);
    
    return { worker: newWorker, workItemWorker };
  } catch (error) {
    console.error("Error adding worker to registry and assigning:", error);
    throw new Error("Failed to add worker to registry and assign to work item");
  }
}
