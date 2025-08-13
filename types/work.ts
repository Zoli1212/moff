// ParsedWork and related types for work parsing

export interface ParsedWork {
  location: string;
  description: string;
  estimatedDuration: string;
  workItems: WorkItem[];
}

export type WorkItemFromDb = Omit<
  WorkItem,
  "tools" | "materials" | "workers" | "workItemWorkers" | "description"
> & {
  description?: string | null;
  tools?: Tool[] | null;
  materials?: Material[] | null;
  workers?: Worker[] | null;
  workItemWorkers?: WorkItemWorker[] | null;
};

export interface WorkItem {
  id: number;
  workId: number;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  materialUnitPrice?: number | null;
  workTotal?: number | null;
  materialTotal?: number | null;
  totalPrice: number;
  tools: Tool[];
  materials: Material[];
  workers: Worker[];
  workItemWorkers: WorkItemWorker[];
  createdAt: Date;
  updatedAt: Date;
  tenantEmail: string;
}

export interface Tool {
  id: number;
  name: string;
  displayName?: string | null;
  quantity: number;
  
}

export interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface Worker {
  id: number;
  name: string;
  role?: string | null;
  workId: number;
  workItemId: number;
  hired: boolean | null;
  workers?: unknown; // JSON field from Prisma schema
  email?: string;
  phone?: string;
  avatarUrl?: string;
  profession?: string;
}

export interface WorkItemWorker {
  // Define fields based on your WorkItemWorker model
  id: number;
  workerId: number;
  workItemId: number;
  quantity: number;
}

export interface Professional {
  type: string;
  quantity: number;
}
