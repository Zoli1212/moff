"use server";

import { PrismaClient } from "@prisma/client";
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

/**
 * Update work image URL in database
 */
export async function updateWorkImageUrl(workId: number, imageUrl: string | null) {
  try {
    // Get current user for tenant filtering
    const user = await currentUser();
    const tenantEmail = user?.emailAddresses?.[0]?.emailAddress;

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
