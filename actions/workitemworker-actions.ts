"use server";
import { prisma } from '@/lib/prisma';

export async function registerAndUpdateWorkItemWorker({
  id, // <- WorkItemWorker rekord id-ja
  name,
  email,
  phone,
  workforceRegistryId,
}: {
  id: number;
  name: string;
  email: string;
  phone: string;
  workforceRegistryId: number;
}) {

  console.log(id, name, email, phone, workforceRegistryId, 'UPDATE')
  // Frissítjük a rekordot az új adatokkal és regisztrációs id-val
  return prisma.workItemWorker.update({
    where: { id },
    data: {
      name,
      email,
      phone,
      workforceRegistryId,
    },
  });
}

