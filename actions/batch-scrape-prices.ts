"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function batchScrapePrices() {
  console.log("\n🚀 [batchScrapePrices] Server action called");

  // Check authentication and get tenant email
  const { tenantEmail } = await getTenantSafeAuth();
  console.log(`📊 [batchScrapePrices] Processing works for: ${tenantEmail}`);

  // Get workItems that need price check (3 days old or never checked)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const workItemsToUpdate = await prisma.workItem.findMany({
    where: {
      tenantEmail,
      work: {
        status: { in: ["pending", "in_progress"] },
        isActive: true,
      },
      materialUnitPrice: { gt: 0 }, // Only where there is material cost
      OR: [
        { lastPriceCheck: null },
        { lastPriceCheck: { lt: threeDaysAgo } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    take: 50, // Limit to 50 items per batch to avoid timeout
  });

  console.log(
    `📊 [batchScrapePrices] Found ${workItemsToUpdate.length} items to update for ${tenantEmail}`
  );

  return {
    success: true,
    results: {
      total: workItemsToUpdate.length,
      success: 0,
      failed: 0,
    },
    tenantEmail,
    message: `${workItemsToUpdate.length} tétel frissítése folyamatban. Kérlek használd a böngésző fetch-et (/test-batch-scrape oldal), mert a server-side fetch nem támogatott Next.js dev módban.`,
    workItems: workItemsToUpdate,
  };
}
