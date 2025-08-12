import { WorkToolsRegistry, ToolsRegistry } from '@prisma/client';

/**
 * Represents an assigned tool for a work, including the registry entry and the full tool object.
 */
import type { Tool as BaseTool } from '@/types/work';

/**
 * AssignedTool structure matches the frontend usage in ToolsSlotsSection and the backend shape.
 */
export type AssignedTool = {
  id: number;
  workId: number;
  toolId: number;
  toolName: string;
  displayName?: string | null;
  quantity: number;
  tool: BaseTool & { description: string | null };
};
