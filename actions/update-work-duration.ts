"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Update work estimated duration in database
 */
export async function updateWorkDuration(
  workId: number, 
  durationDays: number
) {
  try {
    // Get tenant-safe auth (handles tenant selector properly)
    const { user, tenantEmail } = await getTenantSafeAuth();

    if (!tenantEmail) {
      throw new Error('No tenant email found');
    }

    // Format duration as "X nap"
    const estimatedDuration = `${durationDays} nap`;

    const updatedWork = await prisma.work.update({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
      data: {
        estimatedDuration: estimatedDuration,
      },
    });

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work duration:', error);
    return { success: false, error: 'Failed to update work duration' };
  } finally {
    await prisma.$disconnect();
  }
}
