// WorkDiary interface based on Prisma schema
export interface WorkDiary {
  id: number;
  workId: number;
  workItemId: number;
  date: Date;
  description: string;
  weather?: string | null;
  temperature?: number | null;
  progress?: number | null; // 0-100 percentage
  issues?: string | null;
  notes?: string | null;
  reportedById?: string | null;
  reportedByName?: string | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  tenantEmail: string;
}
