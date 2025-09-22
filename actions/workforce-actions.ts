"use server";
import { prisma } from '@/lib/prisma';
import { getTenantSafeAuth } from '@/lib/tenant-auth';

export async function getWorkforce() {
  const { user, tenantEmail } = await getTenantSafeAuth();
  return prisma.workforceRegistry.findMany({
    where: { tenantEmail }
  });
}

export async function addWorkforceMember({ name, email, phone, role, avatarUrl }: { name: string; email: string; phone: string; role?: string; avatarUrl?: string }) {
  if (!name || !email || !phone || !role) throw new Error('Missing required fields');
  const { user, tenantEmail } = await getTenantSafeAuth();
  return prisma.workforceRegistry.create({
    data: {
      name,
      email,
      phone,
      role,
      tenantEmail,
      ...(avatarUrl && { avatarUrl }), 
    },
  });
}
