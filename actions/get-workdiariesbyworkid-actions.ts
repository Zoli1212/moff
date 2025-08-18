import { prisma } from '@/lib/prisma';
import { WorkDiary } from '@/types/work-diary';

export interface WorkDiaryWithItem extends WorkDiary {
  workItem?: {
    id: number;
    name: string;
    description?: string | null;
  };
}

export async function getWorkDiariesByWorkId(workId: number): Promise<WorkDiaryWithItem[]> {
  const diaries = await prisma.workDiary.findMany({
    where: { workId },
    orderBy: { date: 'desc' },
    include: {
      workItem: {
        select: { id: true, name: true, description: true }
      }
    }
  });
  return diaries.map((d) => ({
    ...d,
    date: new Date(d.date),
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
  }));
}

