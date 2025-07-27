// ParsedWork and related types for work parsing

export interface ParsedWork {
  location: string;
  description: string;
  estimatedDuration: string;
  workItems: WorkItem[];
}

export interface WorkItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  materialUnitPrice: string;
  workTotal: string;
  materialTotal: string;
  totalPrice: string;
  description: string;
  requiredProfessionals: Professional[];
  tools: string;
  materials: string;
}

export interface Professional {
  type: string;
  quantity: number;
}
