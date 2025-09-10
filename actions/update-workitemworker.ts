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
  // tenantEmail existence already verified above if needed later
  // Use deleteMany to avoid P2025 when the record is already gone
  await prisma.workItemWorker.deleteMany({ where: { id } });
  return { success: true } as const;
}
