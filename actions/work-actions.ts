'use server';

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getUserWorks() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const emailId = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress;

  const works = await prisma.work.findMany({
    where: {
      tenantEmail: emailId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return works;
}

export async function deleteWork(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify the work belongs to the user
  const work = await prisma.work.findUnique({
    where: { id },
    select: { 
      tenantEmail: true,
      workItems: {
        select: { id: true }
      }
    }
  });

  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error('Unauthorized');
  }

  // Get all workItem IDs for this work

  // Soft delete: set isActive to false
  await prisma.work.update({
    where: { id },
    data: { isActive: false }
  });

  return { success: true };

}

// --- ÚJ: AI válasz szerinti mentés ---
export async function updateWorkWithAIResult(workId: number, aiResult: any) {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const email = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;

  // Ellenőrzés, hogy a work a felhasználóhoz tartozik
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { tenantEmail: true }
  });
  if (!work) {
    console.error(`[updateWorkWithAIResult] Work not found for id: ${workId}`);
    return { success: false, error: `Work not found for id: ${workId}` };
  }
  if (work.tenantEmail !== email) {
    console.error(`[updateWorkWithAIResult] Unauthorized: user ${email} does not own work ${workId}`);
    return { success: false, error: 'Unauthorized: user does not own this work' };
  }

  // Work mezők frissítése
  let updatedWork = null;
  try {
    updatedWork = await prisma.work.update({
    where: { id: workId },
    data: {
      location: aiResult.location,
      totalWorkers: aiResult.totalWorkers,
      totalLaborCost: aiResult.totalLaborCost,
      totalTools: Array.isArray(aiResult.totalTools) ? aiResult.totalTools.length : Number(aiResult.totalTools) || 0,
      totalToolCost: aiResult.totalToolCost,
      totalMaterials: Array.isArray(aiResult.totalMaterials) ? aiResult.totalMaterials.length : Number(aiResult.totalMaterials) || 0,
      totalMaterialCost: aiResult.totalMaterialCost,
      estimatedDuration: aiResult.estimatedDuration,
      // bármi egyéb mező, amit az AI visszaad
    }
  });
  } catch (err) {
    console.error(`[updateWorkWithAIResult] Failed to update Work:`, err);
    return { success: false, error: 'Failed to update Work', details: err instanceof Error ? err.message : String(err) };
  }

  // WorkItemek upsertelése (létező törlés, új beszúrás)
  try {
    await prisma.workItem.deleteMany({ where: { workId } });
    if (Array.isArray(aiResult.workItems)) {
      for (const item of aiResult.workItems) {
        await prisma.workItem.create({
          data: {
            workId,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || '',
            unitPrice: Number(item.unitPrice) || 0,
            materialUnitPrice: Number(item.materialUnitPrice) || 0,
            workTotal: Number(item.workTotal) || 0,
            materialTotal: Number(item.materialTotal) || 0,
            totalPrice: Number(item.totalPrice) || 0,
            tenantEmail: email,
          }
        });
      }
    }
  } catch (err) {
    console.error(`[updateWorkWithAIResult] Failed to create WorkItems:`, err);
    return { success: false, error: 'Failed to create WorkItems', details: err instanceof Error ? err.message : String(err) };
  }

  // Visszaadjuk a teljes frissített Work-ot, WorkItemekkel
  const result = await prisma.work.findUnique({
    where: { id: workId },
    include: { workItems: true }
  });
  return { success: true, data: result };

}

export async function getWorkById(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      workItems: true,
      workers: true,
      materials: true,
      tools: true,
      workDiaries: true,
    },
  });

  // Verify the work belongs to the user
  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error('Unauthorized');
  }

  return work;
}
