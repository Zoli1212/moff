// Shared normalizeWork for both server and client

export interface Work {
  id: number;
  title: string;
  offerId: number;
  offerDescription?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  location?: string | null;
  totalWorkers: number;
  totalLaborCost?: number | null;
  totalTools: number;
  totalToolCost?: number | null;
  totalMaterials: number;
  totalMaterialCost?: number | null;
  estimatedDuration?: string | null;
  progress?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantEmail: string;
}

export function normalizeWork(raw: Partial<Work>): Work {
  return {
    id: raw.id!,
    title: raw.title!,
    offerId: raw.offerId!,
    offerDescription: raw.offerDescription ?? null,
    status: raw.status!,
    startDate: raw.startDate ? new Date(raw.startDate) : null,
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    location: raw.location ?? null,
    totalWorkers: raw.totalWorkers ?? 0,
    totalLaborCost: raw.totalLaborCost ?? null,
    totalTools: raw.totalTools ?? 0,
    totalToolCost: raw.totalToolCost ?? null,
    totalMaterials: raw.totalMaterials ?? 0,
    totalMaterialCost: raw.totalMaterialCost ?? null,
    estimatedDuration: raw.estimatedDuration ?? null,
    progress: raw.progress ?? null,
    isActive: raw.isActive!,
    createdAt: new Date(raw.createdAt!),
    updatedAt: new Date(raw.updatedAt!),
    tenantEmail: raw.tenantEmail!,
  };
}
