// WorkDiary interface based on Prisma schema
export interface WorkDiary {
  id: number;
  workId: number;
  workItemId: number;
  date: Date;
  description: string;
  weather?: string | null;
  temperature?: number | null;
  quantity?: number | null;
  issues?: string | null;
  notes?: string | null;
  reportedById?: string | null;
  reportedByName?: string | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  tenantEmail: string;
  unit?: string | null;
  progress?: number | null;
  workHours?: number | null;
}

// Types for WorkDiaryItem create/update actions
type WorkDiaryItemBase = {
  diaryId?: number;
  workId?: number;
  workItemId?: number;
  workerId?: number;
  email?: string;
  name?: string;
  workItemWorkerId?: number;
  date?: Date;
  quantity?: number;
  unit?: string;
  workHours?: number;
  images?: string[];
  notes?: string;
  accepted?: boolean;
};

export type WorkDiaryItemCreate = Omit<WorkDiaryItemBase, "workId" | "workItemId" | "diaryId"> & {
  diaryId: number;
  workId: number;
  workItemId: number;
};

export type WorkDiaryItemUpdate = WorkDiaryItemBase & {
  id: number;
};

