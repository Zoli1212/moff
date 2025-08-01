"use server";
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function getWorkforce() {
  return prisma.workforceRegistry.findMany();
}

export async function addWorkforceMember({ name, email, phone, role }: { name: string; email: string; phone: string; role?: string }) {
  if (!name || !email || !phone || !role) throw new Error('Missing required fields');
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error('No tenant email found');
  return prisma.workforceRegistry.create({
    data: { name, email, phone, role, tenantEmail, currentlyAvailable: true },
  });
}
