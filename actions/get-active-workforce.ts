"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function getActiveWorkforce() {
  const { tenantEmail } = await getTenantSafeAuth();

  try {
    const activeWorkers = await prisma.workforceRegistry.findMany({
      where: {
        tenantEmail: tenantEmail,
        // isActive: true, // TODO: Add after Prisma schema migration
      },
      orderBy: {
        name: 'asc',
      },
    });

    return activeWorkers;
  } catch (error) {
    console.error("Error fetching active workforce:", error);
    throw new Error("Failed to fetch active workforce");
  }
}
