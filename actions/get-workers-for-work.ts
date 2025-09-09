"use server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export interface WorkerForWork {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  workItemId: number | null;
  avatarUrl: string | null;
}

export async function getWorkersForWork(workId: number): Promise<WorkerForWork[]> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const tenantEmail =
    user.emailAddresses[0]?.emailAddress ||
    user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) {
    throw new Error("Tenant email not found");
  }

  try {
    // Query all workers from workItemWorker table for this work
    const workers = await prisma.workItemWorker.findMany({
      where: {
        workId: workId,
        tenantEmail: tenantEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        workItemId: true,
        avatarUrl: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    return workers;
  } catch (error) {
    console.error("Error fetching workers for work:", error);
    throw new Error("Failed to fetch workers for work");
  }
}
