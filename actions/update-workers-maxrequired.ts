"use server";
import { prisma } from "@/lib/prisma";

/**
 * Frissíti az összes worker maxRequired mezőjét az adott workId-hoz, a frontend által kiszámolt értékek alapján.
 * @param workId az adott work azonosítója
 * @param workerIdToMaxNeeded { [workerId]: maxRequired }
 */
export async function updateWorkersMaxRequiredAction(workId: number, workerIdToMaxNeeded: Record<number, number>) {
  const updatePromises = Object.entries(workerIdToMaxNeeded).map(([workerId, maxRequired]) =>
    prisma.worker.update({
      where: { id: Number(workerId), workId },
      data: { maxRequired },
    })
  );
  await Promise.all(updatePromises);
  return { success: true };
}
