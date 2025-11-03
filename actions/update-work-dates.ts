"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Update work start and end dates in database and recalculate estimatedDuration
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

    // Calculate estimatedDuration if both dates are provided
    let estimatedDuration: string | undefined = undefined;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Calculate difference in days
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        estimatedDuration = `${diffDays} nap`;
      }
    }

    // Prepare update data
    const updateData: {
      startDate: Date | null;
      endDate: Date | null;
      estimatedDuration?: string;
    } = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    // Add estimatedDuration if calculated
    if (estimatedDuration) {
      updateData.estimatedDuration = estimatedDuration;
    }

    const updatedWork = await prisma.work.update({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
      data: updateData,
    });

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work dates:', error);
    return { success: false, error: 'Failed to update work dates' };
  } finally {
    await prisma.$disconnect();
  }
}
