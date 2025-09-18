"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function getWorkItemWorkersForWork(workId: number) {
  const { tenantEmail } = await getTenantSafeAuth();

  // Query workItemWorker table directly using workId field (not relation)
  const workItemWorkers = await prisma.workItemWorker.findMany({
    where: {
      workId: workId,
      tenantEmail: tenantEmail,
    },
  });

  console.log(`[getWorkItemWorkersForWork] workItemWorkers for workId ${workId}:`, workItemWorkers);

  return workItemWorkers;
}
