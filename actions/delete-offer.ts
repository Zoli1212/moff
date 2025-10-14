"use server";

import { PrismaClient } from "@prisma/client";
import { getTenantSafeAuth } from '@/lib/tenant-auth';

const prisma = new PrismaClient();

/**
 * Delete offer if it's in draft status (not converted to work)
 */
export async function deleteOffer(offerId: number) {
  try {
    // Get tenant-safe auth (handles tenant selector properly)
    const { user, tenantEmail } = await getTenantSafeAuth();

    if (!tenantEmail) {
      throw new Error('No tenant email found');
    }

    // First check if offer exists and is in draft status
    const offer = await prisma.offer.findUnique({
      where: {
        id: offerId,
        tenantEmail: tenantEmail,
      },
      include: {
        work: true, // Check if there's associated work
      },
    });

    if (!offer) {
      return { success: false, error: 'Ajánlat nem található' };
    }

    // Check if offer has associated work (converted to work)
    if (offer.work) {
      return { success: false, error: 'Az ajánlat már munkába lett állítva, nem törölhető' };
    }

    // Check if offer is in draft status
    if (offer.status !== 'draft') {
      return { success: false, error: 'Csak piszkozat státuszú ajánlatok törölhetők' };
    }

    // First delete all related billing records
    await prisma.billing.deleteMany({
      where: {
        offerId: offerId,
        tenantEmail: tenantEmail,
      },
    });

    // Then delete the offer
    await prisma.offer.delete({
      where: {
        id: offerId,
        tenantEmail: tenantEmail,
      },
    });

    return { success: true, message: 'Ajánlat sikeresen törölve' };
  } catch (error) {
    console.error('Error deleting offer:', error);
    return { success: false, error: 'Hiba történt az ajánlat törlésekor' };
  } finally {
    await prisma.$disconnect();
  }
}
