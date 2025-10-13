"use server";

import { prisma } from "@/lib/prisma";

export async function checkWorkHasDiaries(workId: number) {
  try {
    // Check if work has any diary entries
    const workDiaryCount = await prisma.workDiaryItem.count({
      where: { workId }
    });

    return {
      success: true,
      hasDiaries: workDiaryCount > 0,
      diaryCount: workDiaryCount
    };
  } catch (error) {
    console.error("Error checking work diaries:", error);
    return {
      success: false,
      error: "Hiba a naplóbejegyzések ellenőrzésekor"
    };
  }
}

export async function deleteWorkWithRelatedData(workId: number) {
  try {
    // Start a transaction to ensure all deletions succeed or none do
    await prisma.$transaction(async (tx) => {
      // 1. Delete WorkDiaryItems
      await tx.workDiaryItem.deleteMany({
        where: { workId }
      });

      // 2. Delete WorkItemWorkers
      await tx.workItemWorker.deleteMany({
        where: {
          workItem: {
            workId
          }
        }
      });

      // 3. Delete WorkItems (this will cascade to related data)
      await tx.workItem.deleteMany({
        where: { workId }
      });

      // 4. Delete Workers associated with this work
      await tx.worker.deleteMany({
        where: { workId }
      });

      // 5. Delete Tools associated with this work
      await tx.tool.deleteMany({
        where: { workId }
      });

      // 6. Delete Materials associated with this work
      await tx.material.deleteMany({
        where: { workId }
      });

      // 7. Finally delete the Work itself
      await tx.work.delete({
        where: { id: workId }
      });
    });

    return {
      success: true,
      message: "A munka és minden kapcsolódó adat sikeresen törölve"
    };
  } catch (error) {
    console.error("Error deleting work:", error);
    return {
      success: false,
      error: "Hiba a munka törlésekor"
    };
  }
}
