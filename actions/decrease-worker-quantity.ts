'server only';

import { prisma } from "@/lib/prisma";

export async function decreaseWorkerQuantity(workItemId: number, role: string): Promise<{ success: boolean }> {
  try {
    // Find the workItemWorker with the specified role in the workItem
    const workItemWorker = await prisma.workItemWorker.findFirst({
      where: {
        workItemId: workItemId,
        role: role
      }
    });

    if (!workItemWorker) {
      throw new Error(`Nem található ${role} munkás ebben a munkafázisban`);
    }

    if (workItemWorker.quantity > 1) {
      // If quantity > 1, just decrease it by 1
      await prisma.workItemWorker.update({
        where: { id: workItemWorker.id },
        data: { 
          quantity: { decrement: 1 }
        }
      });
    } else {
      // If quantity is 1, delete the worker assignment
      await prisma.workItemWorker.delete({
        where: { id: workItemWorker.id }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error decreasing worker quantity:', error);
    throw new Error('Hiba történt a munkás mennyiségének csökkentése közben');
  }
}
