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
  // Set inProgress to false for this workItem
  await prisma.workItem.update({
    where: { id: workItemId },
    data: { inProgress: false },
  });
  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true };
}

export async function updateWorkDiary({
  id,
  workId,
  workItemId,
  description,
  weather,
  temperature,
  progress,
  issues,
  notes,
  reportedById,
  reportedByName,
  unit,
  images,
}: {
  id: number;
  workId?: number;
  workItemId?: number;
  description?: string;
  weather?: string | null;
  temperature?: number | null;
  progress?: number | null;
  issues?: string | null;
  notes?: string | null;
  reportedById?: string | null;
  reportedByName?: string | null;
  unit?: string | null;
  images?: string[] | null;
}) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

  // Only allow updating the contractor's own diary entry
  const diary = await prisma.workDiary.findFirst({
    where: { id, workId, workItemId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found or not owned by user." };
  }

  // Only update fields that exist in WorkDiary and are provided
  const data: any = {};
  if (description !== undefined) data.description = description;
  if (weather !== undefined) data.weather = weather;
  if (temperature !== undefined) data.temperature = temperature;
  if (progress !== undefined) data.progress = progress;
  if (issues !== undefined) data.issues = issues;
  if (notes !== undefined) data.notes = notes;
  if (reportedById !== undefined) data.reportedById = reportedById;
  if (reportedByName !== undefined) data.reportedByName = reportedByName;
  if (unit !== undefined) data.unit = unit;
  if (images !== undefined) data.images = images;

  const updated = await prisma.workDiary.update({
    where: { id },
    data,
  });
  revalidatePath(`/works/diary/${workId}`);
  return { success: true, data: updated };
}

/**
 * Update a WorkDiaryItem (not WorkDiary) entry
 * @param fields Fields for WorkDiaryItem: id, workId, workItemId, workerId, date, quantity, workHours, images, notes
 * @returns { success, data } or { success, message }
 */
export async function updateWorkDiaryItem({
  id,
  workId,
  workItemId,
  workerId,
  date,
  quantity,
  workHours,
  images,
  notes
}: {
  id: number;
  workId?: number;
  workItemId?: number;
  workerId?: number;
  date?: Date;
  quantity?: number;
  workHours?: number;
  images?: string[];
  notes?: string;
}) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const userEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) throw new Error("No user email found");

  // Optionally check user permissions here if needed

  // Build update data object
  const updateData: any = {};
  if (workId !== undefined) updateData.workId = workId;
  if (workItemId !== undefined) updateData.workItemId = workItemId;
  if (workerId !== undefined) updateData.workerId = workerId;
  if (date !== undefined) updateData.date = date;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (workHours !== undefined) updateData.workHours = workHours;
  if (images !== undefined) updateData.images = images;
  if (notes !== undefined) updateData.notes = notes;

  try {
    const updated = await prisma.workDiaryItem.update({
      where: { id },
      data: updateData,
    });
    if (workId) {
      revalidatePath(`/works/diary/${workId}`);
      revalidatePath(`/works/tasks/${workId}`);
    }
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
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

  // Set inProgress to true for this workItem
  await prisma.workItem.update({
    where: { id: workItemId },
    data: { inProgress: true },
  });

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}
