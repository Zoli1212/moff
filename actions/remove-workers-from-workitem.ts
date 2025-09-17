'server only';

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function removeWorkersFromWorkItem(workItemId: number, role: string): Promise<{ success: boolean }> {
  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    // First, get the workItem to find the workId
    const workItem = await prisma.workItem.findFirst({
      where: {
        id: workItemId,
        work: { tenantEmail: userEmail }
      },
      include: {
        work: true
      }
    });

    if (!workItem) {
      throw new Error('WorkItem not found or access denied');
    }

    const workId = workItem.workId;

    // Delete all workItemWorker entries with the specified role in the workItem
    const deleteResult = await prisma.workItemWorker.deleteMany({
      where: {
        workItemId: workItemId,
        role: role
      }
    });

    console.log(`Deleted ${deleteResult.count} workItemWorker entries for role ${role} in workItem ${workItemId}`);

    // Delete entire Worker records that match workId AND workItemId and have the specified role
    const workerDeleteResult = await prisma.worker.deleteMany({
      where: {
        workId: workId,
        workItemId: workItemId,
        name: role,
        work: { tenantEmail: userEmail }
      }
    });

    console.log(`Deleted ${workerDeleteResult.count} Worker records for role ${role} in work ${workId} and workItem ${workItemId}`);

    return { success: true };
  } catch (error) {
    console.error('Error removing workers from workItem:', error);
    throw new Error('Hiba történt a munkások eltávolítása közben');
  }
}
