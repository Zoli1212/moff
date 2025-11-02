"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Update work estimated duration and recalculate endDate based on startDate + duration
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

    // First, get the current work to access startDate
    const currentWork = await prisma.work.findUnique({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
    });

    if (!currentWork) {
      throw new Error('Work not found');
    }

    // Format duration as "X nap"
    const estimatedDuration = `${durationDays} nap`;

    // Determine the base date for calculation
    let baseDate: Date;
    let shouldUpdateStartDate = false;

    if (currentWork.startDate) {
      // Use existing startDate
      baseDate = new Date(currentWork.startDate);
    } else if (currentWork.createdAt) {
      // No startDate exists, use createdAt and mark to save it as startDate
      baseDate = new Date(currentWork.createdAt);
      shouldUpdateStartDate = true;
    } else {
      // Fallback to current date if neither exists
      baseDate = new Date();
      shouldUpdateStartDate = true;
    }

    // Calculate new endDate based on baseDate + durationDays
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    // Prepare update data
    const updateData: {
      estimatedDuration: string;
      endDate: Date;
      startDate?: Date;
    } = {
      estimatedDuration: estimatedDuration,
      endDate: newEndDate,
    };

    // If startDate didn't exist, save the baseDate as startDate
    if (shouldUpdateStartDate) {
      updateData.startDate = baseDate;
    }

    // Update work with new duration and calculated dates
    const updatedWork = await prisma.work.update({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
      data: updateData,
    });

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work duration:', error);
    return { success: false, error: 'Failed to update work duration' };
  } finally {
    await prisma.$disconnect();
  }
}
