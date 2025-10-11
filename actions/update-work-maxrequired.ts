"use server";
import { prisma } from "@/lib/prisma";

/**
 * Frissíti a Work tábla maxRequiredWorkers mezőjét az adott workId-hoz.
 * @param workId az adott work azonosítója
 * @param maxRequiredWorkers az összesen szükséges munkások száma
 */
export async function updateWorkMaxRequiredWorkers(workId: number, maxRequiredWorkers: number) {
  try {
    await prisma.work.update({
      where: { id: workId },
      data: { maxRequiredWorkers },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update maxRequiredWorkers:", error);
    throw error;
  }
}
