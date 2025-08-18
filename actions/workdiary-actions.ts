"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteWorkDiary({ workId, workItemId }: { workId: number; workItemId: number }) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

  // Find the diary for this workItem and user
  const diary = await prisma.workDiary.findFirst({
    where: { workId, workItemId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found for this task." };
  }

  await prisma.workDiary.delete({ where: { id: diary.id } });
  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true };
}

export async function createWorkDiary({ workId, workItemId }: { workId: number; workItemId: number }) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

  // Check if diary already exists for this workItem
  const existing = await prisma.workDiary.findFirst({
    where: { workId, workItemId, tenantEmail },
  });
  if (existing) {
    return { success: false, message: "Diary already exists for this task." };
  }

  const diary = await prisma.workDiary.create({
    data: {
      workId,
      workItemId,
      tenantEmail,
      date: new Date(),
      description: "",
    },
  });

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}
