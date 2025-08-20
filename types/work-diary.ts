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
