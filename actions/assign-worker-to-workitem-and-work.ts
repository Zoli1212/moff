"use server";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

export interface AssignWorkerToWorkItemAndWorkParams {
  workId: number;
  workItemId: number | null;
  workerId: number;
  name: string;
  email: string;
  phone: string;
  profession: string;
  quantity?: number;
  avatarUrl?: string;
}

export async function assignWorkerToWorkItemAndWork(
  params: AssignWorkerToWorkItemAndWorkParams
) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const {
    workId,
    workItemId,
    workerId,
    name,
    email,
    phone,
    profession,
    quantity = 1,
    avatarUrl,
  } = params;

  try {
    // 1. Add to workItemWorkers table
    const workItemWorker = await prisma.workItemWorker.create({
      data: {
        workId: workId, // Add workId for general workers support
        workItemId,
        workerId,
        name,
        email,
        phone,
        role: profession,
        quantity,
        avatarUrl,
        tenantEmail,
      },
    });

    // 2. Find or create Worker record for this profession
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
        workforceRegistryId: workerId,
        name,
        email,
        phone,
        profession,
        avatarUrl,
      };

      worker = await prisma.worker.create({
        data: {
          workId,
          workItemId: workItemId, // Link to the workItem
          name: profession,
          role: profession,
          tenantEmail,
          workers: JSON.stringify([initialWorkerEntry]), // Initialize with the current worker
        },
      });
    }

    // Update Worker.workers JSON array (only if worker already existed)
    if (worker.workers) {
      // Parse existing workers array from Worker.workers JSON
      let workersArray: any[] = [];
      try {
        workersArray = worker.workers ? JSON.parse(worker.workers as string) : [];
      } catch (e) {
        workersArray = [];
      }

      // Add new worker entry to the array
      workersArray.push({
        workforceRegistryId: workerId,
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

    return workItemWorker;
  } catch (error) {
    console.error("Error assigning worker:", error);
    throw new Error("Failed to assign worker to work item and work");
  }
}
