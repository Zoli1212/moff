"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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
      content: "", // Default empty content
    },
  });

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}
