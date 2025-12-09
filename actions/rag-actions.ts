"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

export async function syncRAGProgress(workId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    // Get all workItems for this work
    const workItems = await prisma.workItem.findMany({
      where: {
        workId: workId,
        tenantEmail: tenantEmail,
      },
      select: {
        id: true,
        name: true,
        completedQuantity: true,
      }
    });

    let syncedCount = 0;
    let resetCount = 0;

    // Process each workItem
    for (const workItem of workItems) {
      // Find the latest diary entry for this workItem
      const latestDiaryEntry = await prisma.workDiaryItem.findFirst({
        where: {
          workItemId: workItem.id,
          tenantEmail: tenantEmail,
        },
        orderBy: {
          date: 'desc'
        },
        select: {
          progressAtDate: true,
          date: true
        }
      });

      let newCompletedQuantity: number;

      if (latestDiaryEntry) {
        // Use progressAtDate from latest diary entry
        newCompletedQuantity = latestDiaryEntry.progressAtDate || 0;
        syncedCount++;
      } else {
        // No diary entries, set to 0
        newCompletedQuantity = 0;
        resetCount++;
      }

      // Update workItem completedQuantity
      await prisma.workItem.update({
        where: {
          id: workItem.id,
          tenantEmail: tenantEmail,
        },
        data: {
          completedQuantity: newCompletedQuantity,
          progress: newCompletedQuantity > 0 ? Math.floor((newCompletedQuantity / (workItem.completedQuantity || 1)) * 100) : 0,
        }
      });
    }

    // Revalidate paths
    revalidatePath(`/works/works/${workId}`);
    revalidatePath(`/works/tasks/${workId}`);
    revalidatePath(`/works/diary/${workId}`);

    const message = `Synchronization completed. ${syncedCount} items synced, ${resetCount} items reset to 0.`;

    return {
      success: true,
      message,
      syncedCount,
      resetCount
    };

  } catch (error) {
    console.error('❌ [RAG Sync] Error:', error);
    return {
      success: false,
      message: `Synchronization failed: ${(error as Error).message}`
    };
  }
}
