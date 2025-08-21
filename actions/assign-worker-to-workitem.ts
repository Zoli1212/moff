"use server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

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
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail =
    user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

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
