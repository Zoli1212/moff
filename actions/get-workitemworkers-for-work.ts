"use server";

import { prisma } from "@/lib/prisma";

export async function getWorkItemWorkersForWork(workId: number) {
  // First, get the work to find its tenantEmail
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { tenantEmail: true },
  });

  if (!work) {
    console.log(`[getWorkItemWorkersForWork] Work not found for workId ${workId}`);
    return [];
  }

  // Query workItemWorker table using the work's tenantEmail (not the logged-in user's email)
  // This ensures workers can see all workers assigned to the work
  const workItemWorkers = await prisma.workItemWorker.findMany({
    where: {
      workId: workId,
      tenantEmail: work.tenantEmail,
    },
  });

  console.log(`[getWorkItemWorkersForWork] workItemWorkers for workId ${workId}:`, workItemWorkers);

  return workItemWorkers;
}
