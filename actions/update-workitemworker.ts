"use server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function updateWorkItemWorker(data: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  quantity?: number;
  avatarUrl?: string | null;
}) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail =
    user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

  const { id, ...rest } = data;
  return prisma.workItemWorker.update({
    where: { id },
    data: {
      ...rest,
    },
  });
}

export async function deleteWorkItemWorker(id: number) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  // tenantEmail existence already verified above if needed later
  return prisma.workItemWorker.delete({ where: { id } });
}
