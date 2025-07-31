"use server";
import { prisma } from '@/lib/prisma';

export async function getWorkforce() {
  return prisma.workforceRegistry.findMany();
}

export async function addWorkforceMember({ name, email, phone, role }: { name: string; email: string; phone: string; role?: string }) {
  if (!name || !email || !phone) throw new Error('Missing required fields');
  return prisma.workforceRegistry.create({
    data: { name, email, phone, role, currentlyAvailable: true },
  });
}
