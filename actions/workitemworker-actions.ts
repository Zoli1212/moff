"use server";
import { prisma } from "@/lib/prisma";

export async function getGeneralWorkersForWork(workId: number) {
  // First, let's try a direct approach - find workItemWorkers where workItemId is null
  // and check if there's a way to link them to the work
  const result = await prisma.workItemWorker.findMany({
    where: {
      workItemId: null,
      // We need to find another way to link to workId since workItemId is null
      // Let's check if there's a direct workId field or use the worker relation
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      workerId: true,
      workItemId: true,
      quantity: true,
      avatarUrl: true,
      worker: {
        select: {
          workId: true
        }
      }
    }
  });
  
  // Filter by workId from the worker relation
  return result.filter(item => item.worker?.workId === workId);
}

export async function removeGeneralWorkerFromWork(workItemWorkerId: number, workId: number) {
  // Remove from workItemWorker table (this is where general workers are stored with workItemId = null)
  await prisma.workItemWorker.delete({
    where: { id: workItemWorkerId }
  });

  return { success: true };
}

export async function registerAndUpdateWorkItemWorker({
  id, // <- WorkItemWorker rekord id-ja
  name,
  email,
  phone,
  workforceRegistryId,
}: {
  id: number;
  name: string;
  email: string;
  phone: string;
  workforceRegistryId: number;
}) {
  console.log(id, name, email, phone, workforceRegistryId, "UPDATE");
  // Frissítjük a rekordot az új adatokkal és regisztrációs id-val
  return prisma.workItemWorker.update({
    where: { id },
    data: {
      name,
      email,
      phone,
      workforceRegistryId,
    },
  });
}
