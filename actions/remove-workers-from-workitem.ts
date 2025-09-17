'use server';

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

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

    // NOTE: Worker records are kept in the database, only workItemWorker connections are removed
    console.log(`Removed workItemWorker connections for role ${role} from workItem ${workItemId}, but kept Worker records intact`);
    revalidatePath(`/supply/${workId}`)
    revalidatePath(`/supply`)

    return { success: true };
  } catch (error) {
    console.error('Error removing workers from workItem:', error);
    throw new Error('Hiba történt a munkások eltávolítása közben');
  }
}
