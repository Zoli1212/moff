"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Update work image URL in database
 */
export async function updateWorkImageUrl(workId: number, imageUrl: string | null) {
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
        workImageUrl: imageUrl,
      },
    });

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work image URL:', error);
    return { success: false, error: 'Failed to update work image' };
  } finally {
    await prisma.$disconnect();
  }
}
