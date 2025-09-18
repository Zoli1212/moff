"use server";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function updateWorkItemWorker(data: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  quantity?: number;
  avatarUrl?: string | null;
}) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const { id, ...rest } = data;
  return prisma.workItemWorker.update({
    where: { id },
    data: {
      ...rest,
    },
  });
}

export async function deleteWorkItemWorker(id: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  
  console.log(`[deleteWorkItemWorker] Deleting workItemWorker with id: ${id}`);
  
  // Use delete instead of deleteMany to ensure only one specific record is deleted
  const result = await prisma.workItemWorker.delete({ 
    where: { 
      id: id,
      tenantEmail: tenantEmail // Add tenant safety
    } 
  });
  
  console.log(`[deleteWorkItemWorker] Successfully deleted workItemWorker:`, result);
  return { success: true } as const;
}
