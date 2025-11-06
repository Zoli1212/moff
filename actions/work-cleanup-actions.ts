"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Check for works that have been stuck in processingByAI state for more than 5 minutes
 * Returns the list of stuck work IDs without deleting them
 */
export async function checkStuckProcessingWorks() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find works that are stuck in processingByAI state for more than 5 minutes
    const stuckWorks = await prisma.work.findMany({
      where: {
        processingByAI: true,
        updatedAt: {
          lt: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    return { 
      success: true, 
      stuckWorkIds: stuckWorks.map(w => w.id),
      stuckWorks: stuckWorks
    };
  } catch (error) {
    console.error("❌ Error checking stuck works:", error);
    return { 
      success: false, 
      stuckWorkIds: [],
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Delete a specific stuck work and revert its offer to draft
 * This is called when user confirms deletion via modal
 */
export async function deleteStuckWork(workId: number) {
  try {
    // Get work details
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: {
        id: true,
        offerId: true,
        title: true,
      },
    });

    if (!work) {
      return { success: false, error: "Work not found" };
    }

    // Delete the work
    await prisma.work.delete({
      where: { id: workId },
    });

    // Revert offer to draft status if it exists
    if (work.offerId) {
      await prisma.offer.update({
        where: { id: work.offerId },
        data: { status: "draft" },
      });
    }

    console.log(`✅ Deleted stuck work #${workId} (${work.title})`);

    // Revalidate the works page
    revalidatePath("/works");
    revalidatePath("/offers");

    return { 
      success: true,
      message: `Munka törölve: ${work.title}`
    };
  } catch (error) {
    console.error(`❌ Failed to delete work #${workId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
