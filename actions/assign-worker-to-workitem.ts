"use server";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

interface AssignParams {
  workItemId: number;
  workerId: number; // Worker model id (profession entry for the work)
  workforceRegistryId: number; // WorkforceRegistry id for the person
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  quantity?: number; // default 1
}

export async function assignWorkerToWorkItem(params: AssignParams) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const {
    workItemId,
    workerId,
    workforceRegistryId,
    name,
    email,
    phone,
    role,
    avatarUrl,
    quantity = 1,
  } = params;

  // Check for existing assignment with the same email for the same work item
  if (email) {
    const existingAssignment = await prisma.workItemWorker.findFirst({
      where: {
        workItemId: workItemId,
        email: email,
        tenantEmail: tenantEmail, // Ensure check is within the same tenant
      },
    });

    if (existingAssignment) {
      throw new Error(`A(z) '${email}' email című dolgozó már hozzá van rendelve ehhez a feladathoz.`);
    }
  }

  // Create assignment
  const created = await prisma.workItemWorker.create({
    data: {
      workItemId,
      workerId,
      workforceRegistryId,
      name,
      email: email ?? null,
      phone: phone ?? null,
      role: role ?? null,
      quantity,
      tenantEmail,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  return created;
}
