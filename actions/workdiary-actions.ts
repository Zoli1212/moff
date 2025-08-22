"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteWorkDiary({ workId, workItemId }: { workId: number; workItemId: number }) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

  const diary = await prisma.workDiary.findFirst({
    where: { workId, workItemId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found for this task." };
  }

  await prisma.workDiary.delete({ where: { id: diary.id } });

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

  const diary = await prisma.workDiary.findFirst({
    where: { id, workId, workItemId, tenantEmail },
  });
  if (!diary) {
    return { success: false, message: "Diary not found or not owned by user." };
  }

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
 */
export async function updateWorkDiaryItem({
  diaryId,
  id,
  workId,
  workItemId,
  workerId,
  email,
  date,
  quantity,
  unit,
  workHours,
  images,
  notes,
}: {
  diaryId?: number;
  id: number;
  workId?: number;
  workItemId?: number;
  workerId?: number;
  email?: string;
  date?: Date;
  quantity?: number;
  unit?: string;
  workHours?: number;
  images?: string[];
  notes?: string;
}) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const userEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) throw new Error("No user email found");

  const updateData: any = {};
  if (diaryId !== undefined) updateData.diaryId = diaryId;
  if (workId !== undefined) updateData.workId = workId;
  if (workItemId !== undefined) updateData.workItemId = workItemId;
  if (workerId !== undefined) updateData.workerId = workerId;
  if (email !== undefined) updateData.email = email;
  if (date !== undefined) updateData.date = date;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (unit !== undefined) updateData.unit = unit;
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
} // <-- EZ HIÁNYZOTT

/**
 * Create a new WorkDiaryItem entry
 */
export async function createWorkDiaryItem({
  diaryId,
  workId,
  workItemId,
  workerId,
  email,
  date,
  quantity,
  unit,
  workHours,
  images,
  notes,
}: {
  diaryId: number;
  workId: number;
  workItemId: number;
  workerId?: number;
  email?: string;
  date?: Date;
  quantity?: number;
  unit?: string;
  workHours?: number;
  images?: string[];
  notes?: string;
  // id is intentionally omitted for creation
}) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const userEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) throw new Error("No user email found");

  try {
    const createData: any = {
      diaryId,
      workId,
      workItemId,
      tenantEmail: userEmail,
    };
    if (workerId !== undefined) createData.workerId = workerId;
    if (email !== undefined) createData.email = email;
    if (date !== undefined) createData.date = date;
    if (quantity !== undefined) createData.quantity = quantity;
    if (unit !== undefined) createData.unit = unit;
    if (workHours !== undefined) createData.workHours = workHours;
    if (images !== undefined) createData.images = images;
    if (notes !== undefined) createData.notes = notes;

    const created = await prisma.workDiaryItem.create({
      data: createData,
    });
    if (workId) {
      revalidatePath(`/works/diary/${workId}`);
      revalidatePath(`/works/tasks/${workId}`);
    }
    return { success: true, data: created };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function createWorkDiary({ workId, workItemId }: { workId: number; workItemId: number }) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error("No tenant email found");

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

  await prisma.workItem.update({
    where: { id: workItemId },
    data: { inProgress: true },
  });

  revalidatePath(`/works/diary/${workId}`);
  revalidatePath(`/works/tasks/${workId}`);
  return { success: true, data: diary };
}
