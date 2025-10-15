"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function refreshAllCompletedQuantities() {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    
    console.log('🔄 Frissítés indítása: completedQuantity értékek (csak mai napig)');
    
    // Get all WorkItems for this tenant
    const workItems = await prisma.workItem.findMany({
      where: {
        tenantEmail: tenantEmail,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        completedQuantity: true,
      }
    });

    console.log(`📊 Összesen ${workItems.length} WorkItem frissítése...`);
    
    let updatedCount = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    for (const workItem of workItems) {
      // Find the latest diary entry for this workItem (NO date filter - get the absolute latest)
      const latestDiaryEntry = await prisma.workDiaryItem.findFirst({
        where: {
          workItemId: workItem.id,
          tenantEmail: tenantEmail,
        },
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }, // If same date, get the latest by ID
        ],
        select: {
          progressAtDate: true,
          date: true,
        }
      });

      const newCompletedQuantity = latestDiaryEntry?.progressAtDate || 0;
      const currentCompletedQuantity = workItem.completedQuantity || 0;

      // Only update if there's a difference
      if (Math.abs(newCompletedQuantity - currentCompletedQuantity) > 0.01) {
        const progress = newCompletedQuantity > 0 && workItem.quantity ? 
          Math.floor((newCompletedQuantity / workItem.quantity) * 100) : 0;
        
        await prisma.workItem.update({
          where: {
            id: workItem.id,
            tenantEmail: tenantEmail,
          },
          data: {
            completedQuantity: newCompletedQuantity,
            progress: progress,
          }
        });

        console.log(`✅ Frissítve: ${workItem.name} - ${currentCompletedQuantity} → ${newCompletedQuantity}`);
        updatedCount++;
      }
    }

    console.log(`🎉 Frissítés kész! ${updatedCount} WorkItem frissítve ${workItems.length}-ből`);
    
    return {
      success: true,
      message: `${updatedCount} WorkItem frissítve ${workItems.length}-ből`,
      updatedCount,
      totalCount: workItems.length,
    };

  } catch (error) {
    console.error('❌ Hiba a frissítés során:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ismeretlen hiba',
    };
  }
}
