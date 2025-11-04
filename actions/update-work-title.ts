"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

/**
 * Update work title
 */
export async function updateWorkTitle(
  workId: number, 
  title: string
) {
  try {
    // Get tenant-safe auth
    const { user, tenantEmail } = await getTenantSafeAuth();

    if (!tenantEmail) {
      throw new Error('No tenant email found');
    }

    // Verify the work belongs to the current tenant
    const currentWork = await prisma.work.findUnique({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
    });

    if (!currentWork) {
      throw new Error('Work not found or unauthorized');
    }

    // Update work title
    const updatedWork = await prisma.work.update({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
      data: {
        title: title,
      },
    });

    // Revalidate paths
    revalidatePath('/works');
    revalidatePath(`/works/${workId}`);
    revalidatePath(`/(works)/works`);
    revalidatePath(`/(works)/works/${workId}`);

    return { success: true, work: updatedWork };
  } catch (error) {
    console.error('Error updating work title:', error);
    return { success: false, error: 'Failed to update work title' };
  } finally {
    await prisma.$disconnect();
  }
}
