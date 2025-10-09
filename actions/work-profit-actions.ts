"use server";

import { currentUser } from '@clerk/nextjs/server';
import { calculateWorkProfit, WorkProfitCalculationInput, WorkProfitResult } from '@/utils/work-profit-calculator';
import type { WorkItem } from '@/types/work';

/**
 * Server action to calculate work profit with proper tenant filtering
 */
export async function calculateWorkProfitAction(
  workId: number,
  workItems: WorkItem[]
): Promise<WorkProfitResult> {
  try {
    // Get current user for tenant filtering
    const user = await currentUser();
    const tenantEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!tenantEmail) {
      throw new Error('No tenant email found');
    }

    // Call the utility function with tenant email
    const result = await calculateWorkProfit({
      workId,
      workItems,
      tenantEmail,
    });

    return result;
  } catch (error) {
    console.error('Error in calculateWorkProfitAction:', error);
    // Return default values if calculation fails
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
    };
  }
}
