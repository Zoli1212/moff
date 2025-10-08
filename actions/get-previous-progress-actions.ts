"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function getPreviousProgressAtDate(
  workId: number,
  workItemId: number,
  currentDate: string
): Promise<number> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    if (!tenantEmail) {
      console.error("No tenant email found");
      return 0;
    }

    // Find all diary items for this workItem, before current date
    const relevantItems = await prisma.workDiaryItem.findMany({
      where: {
        workId: workId,
        workItemId: workItemId,
        tenantEmail: tenantEmail,
        progressAtDate: {
          not: null,
        },
        date: {
          lt: new Date(currentDate),
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 1, // Only get the most recent one
    });

    // Return the most recent previous progressAtDate, or 0 if none found
    return relevantItems.length > 0 ? (relevantItems[0].progressAtDate || 0) : 0;
  } catch (error) {
    console.error('Error getting previous progressAtDate:', error);
    return 0;
  }
}
