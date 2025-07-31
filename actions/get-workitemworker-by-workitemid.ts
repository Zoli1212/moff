"use server";
import { prisma } from '@/lib/prisma';

export async function getWorkItemWorkerByWorkItemId({
  workItemId,
  workforceRegistryId,
}: {
  workItemId: number;
  workforceRegistryId?: number;
}) {
  // Ha workforceRegistryId is van, akkor az alapján is szűrünk
  return prisma.workItemWorker.findFirst({
    where: {
      workItemId,
      ...(workforceRegistryId ? { workforceRegistryId } : {}),
    },
  });
}
