import { prisma } from "@/lib/prisma";
import { WorkDiary } from "@/types/work-diary";

export interface WorkDiaryItemDTO {
  id: number;
  diaryId: number;
  workId: number;
  workItemId: number;
  workerId: number;
  email: string;
  name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  workHours?: number | null;
  date: Date;
  images: string[];
  notes?: string | null;
  accepted?: boolean | null;
  tenantEmail: string;
  createdAt: Date;
  updatedAt: Date;
  groupNo?: number | null;
}

export interface WorkDiaryWithItem extends WorkDiary {
  workItem?: {
    id: number;
    name: string;
    description?: string | null;
  };
  workDiaryItems: WorkDiaryItemDTO[];
}

export async function getWorkDiariesByWorkId(
  workId: number
): Promise<WorkDiaryWithItem[]> {
  // Only return diaries that have at least one WorkDiaryItem
  const diaries = await prisma.workDiary.findMany({
    where: {
      workId,
      workDiaryItems: { some: {} },
    },
    orderBy: { date: "desc" },
    include: {
      workItem: {
        select: { id: true, name: true, description: true },
      },
      workDiaryItems: {
        select: {
          id: true,
          diaryId: true,
          workId: true,
          workItemId: true,
          workerId: true,
          email: true,
          name: true,
          quantity: true,
          unit: true,
          workHours: true,
          date: true,
          images: true,
          notes: true,
          accepted: true,
          tenantEmail: true,
          createdAt: true,
          updatedAt: true,
          groupNo: true,
        },
        orderBy: { date: "asc" },
      },
    },
  });
  return diaries.map((d) => ({
    ...d,
    date: new Date(d.date),
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
    workDiaryItems: (d.workDiaryItems || []).map((it: any) => ({
      ...it,
      date: new Date(it.date as unknown as string),
      createdAt: new Date(it.createdAt as unknown as string),
      updatedAt: new Date(it.updatedAt as unknown as string),
    })),
  }));
}
