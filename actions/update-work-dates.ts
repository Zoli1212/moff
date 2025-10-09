"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Update work start and end dates in database
 */
export async function updateWorkDates(
  workId: number, 
  startDate: string | null, 
  endDate: string | null
) {
  try {
    // Get tenant-safe auth (handles tenant selector properly)
    const { user, tenantEmail } = await getTenantSafeAuth();

    if (!tenantEmail) {
      throw new Error('No tenant email found');
    }

    const updatedWork = await prisma.work.update({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
      data: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work dates:', error);
    return { success: false, error: 'Failed to update work dates' };
  } finally {
    await prisma.$disconnect();
  }
}
