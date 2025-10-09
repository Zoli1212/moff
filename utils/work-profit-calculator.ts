import type { WorkItem } from "@/types/work";
import { getDailyRateForDiaryItem } from '@/lib/salary-utils';

export interface WorkProfitResult {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

export interface WorkProfitCalculationInput {
  workId: number;
  workItems: WorkItem[];
  tenantEmail?: string;
}

// Segédfüggvény: órabér számítása napi díjból (ugyanaz mint a performance-calculator-ban)
export const getHourlyRate = (dailyRate: number | null | undefined): number => {
  if (!dailyRate) return 0;
  return dailyRate / 8; // Feltételezzük a 8 órás munkanapot
};

/**
 * Dinamikus profit számítás workDiaryItem-ek alapján
 * Ugyanaz a logika, mint a teljesítmény számításnál, de az összes workDiaryItem-re
 */
export async function calculateWorkProfit({
  workId,
  workItems,
  tenantEmail,
}: WorkProfitCalculationInput): Promise<WorkProfitResult> {
  let totalRevenue = 0;
  let totalCost = 0;

  try {
    // Lekérjük az összes workDiaryItem-et és workforce registry adatokat
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const workDiaryItems = await prisma.workDiaryItem.findMany({
      where: {
        workId: workId,
        ...(tenantEmail && { tenantEmail }),
      },
      include: {
        workItem: true,
      },
    });

    // Lekérjük a workforce registry adatokat a pontos órabér számításhoz
    const workforceRegistry = await prisma.workforceRegistry.findMany({
      where: {
        ...(tenantEmail && { tenantEmail }),
      },
    });


    // Számítás minden workDiaryItem-re (ugyanaz a logika mint a performance-calculator-ban)
    workDiaryItems.forEach((diaryItem, index) => {
      const workItem = workItems.find((wi) => wi.id === diaryItem.workItemId);
      
      
      if (!workItem) return;

      // Bevétel számítása: progressMade * unitPrice
      const progressMade = diaryItem.quantity || 0;
      if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
        const revenuePerUnit = workItem.unitPrice;
        const itemRevenue = progressMade * revenuePerUnit;
        totalRevenue += itemRevenue;
      }

      // Költség számítása: pontos órabér a workforce registry alapján (ugyanaz mint performance-calculator-ban)
      const dailyRate = getDailyRateForDiaryItem(diaryItem, workforceRegistry);
      const hourlyRate = getHourlyRate(dailyRate);
      const hoursWorked = diaryItem.workHours || 0;
      
      if (hoursWorked > 0) {
        const itemCost = hoursWorked * hourlyRate;
        totalCost += itemCost;
      }
    });

    await prisma.$disconnect();


  } catch (error) {
    console.error('Error calculating work profit:', error);
  }

  const totalProfit = totalRevenue - totalCost;
  
  // Ugyanaz a profit margin számítás, mint a performance-calculator-ban
  const profitMargin = calculateProfitRatePercentage(totalCost, totalRevenue);

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
  };
}

// Ugyanaz a profit margin számítás függvény, mint a performance-calculator-ban
export const calculateProfitRatePercentage = (
  cost: number,
  revenue: number
): number => {
  // Ha nincs költség, nem lehet profitot számolni
  if (cost <= 0) {
    return 0;
  }

  // Ha nincs bevétel, akkor -100% profitráta
  if (revenue <= 0) {
    return -100;
  }

  // Egyszerű profitráta: (bevétel / költség - 1) * 100
  const profitRate = (revenue / cost - 1) * 100;

  return profitRate;
}
