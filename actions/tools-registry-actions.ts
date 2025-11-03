"use server";
import { prisma } from "@/lib/prisma";
import type { ToolsRegistry } from '@prisma/client';
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";


// List all tools for a company
export async function getToolsRegistryByTenant(): Promise<ToolsRegistry[]> {
  const { user, tenantEmail } = await getTenantSafeAuth();
  return prisma.toolsRegistry.findMany({
    where: { tenantEmail },
    orderBy: { name: 'asc' },
  });
}

// Add a new tool to registry
export async function addToolToRegistry(name: string, quantity: number, description: string, displayName?: string, avatarUrl?: string) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  return prisma.toolsRegistry.create({
    data: {
      name,
      displayName,
      quantity,
      description,
      avatarUrl,
      tenantEmail,
    },
  });
}

// Update tool quantity
export async function updateToolQuantity(registryId: number, quantity: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  // Ellenőrzés, hogy a rekord a tenant-hoz tartozik
  const tool = await prisma.toolsRegistry.findUnique({ where: { id: registryId } });
  if (!tool || tool.tenantEmail !== tenantEmail) throw new Error('Tool not found or access denied');
  return prisma.toolsRegistry.update({
    where: { id: registryId },
    data: { quantity },
  });
}

// Check if a tool exists by name for the current tenant
export async function toolExistsInRegistry(toolName: string): Promise<boolean> {
  const { user, tenantEmail } = await getTenantSafeAuth();
  const tool = await prisma.toolsRegistry.findFirst({
    where: {
      name: toolName,
      tenantEmail
    }
  });
  return !!tool;
}

// Get all assigned tools for a work (with quantities and tool details)
export async function getAssignedToolsForWork(workId: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  return prisma.workToolsRegistry.findMany({
    where: { workId, tenantEmail },
    include: { tool: true }, // assumes relation name is 'tool' in Prisma
  });
}

// Assign a tool to a work (WorkToolsRegistry)
export async function createWorkToolsRegistry(workId: number, toolId: number, quantity: number, toolName: string) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  revalidatePath(`/works/${workId}`);
  revalidatePath(`/works`);
  return prisma.workToolsRegistry.create({
    data: {
      workId,
      toolId,
      toolName,
      quantity,
      tenantEmail,
    },
  });
  
}
// Decrement quantity or remove tool assignment from WorkToolsRegistry
export async function decrementWorkToolQuantity(workToolsRegistryId: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  const assignment = await prisma.workToolsRegistry.findUnique({ where: { id: workToolsRegistryId } });
  if (!assignment || assignment.tenantEmail !== tenantEmail) throw new Error('Assignment not found or access denied');
  if (assignment.quantity > 1) {
    // Decrement quantity

    revalidatePath(`/works/${assignment.workId}`);
    revalidatePath(`/works`);
    return prisma.workToolsRegistry.update({
      where: { id: workToolsRegistryId },
      data: { quantity: assignment.quantity - 1 },
    });
  } else {
    // Remove assignment if only 1 left
    revalidatePath(`/works/${assignment.workId}`);
    revalidatePath(`/works`);
    return prisma.workToolsRegistry.delete({
      where: { id: workToolsRegistryId },
    });
  }
}

// Remove tool assignment from WorkToolsRegistry (regardless of quantity)
export async function removeWorkToolAssignment(workToolsRegistryId: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  const assignment = await prisma.workToolsRegistry.findUnique({ where: { id: workToolsRegistryId } });
  if (!assignment || assignment.tenantEmail !== tenantEmail) throw new Error('Assignment not found or access denied');
  return prisma.workToolsRegistry.delete({
    where: { id: workToolsRegistryId },
  });
}

// Remove tool from specific workItems (WorkToolsRegistry, Tool model, and WorkItem.tools) by name (case-insensitive)
export async function removeToolFromWorkEverywhere(workId: number, toolName: string, workItemIds?: number[]) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  
  // 1. Delete from WorkToolsRegistry
  await prisma.workToolsRegistry.deleteMany({
    where: {
      workId,
      tenantEmail,
      toolName: {
        equals: toolName,
        mode: 'insensitive' // Case-insensitive comparison
      }
    }
  });
  
  // 2. Delete from Tool model (all tools with matching name for this work)
  // Build the where clause
  const whereClause: any = {
    workId,
    tenantEmail,
    name: {
      equals: toolName,
      mode: 'insensitive' // Case-insensitive comparison
    }
  };
  
  // If workItemIds provided, only delete from those workItems
  if (workItemIds && workItemIds.length > 0) {
    whereClause.workItemId = {
      in: workItemIds
    };
  }
  
  await prisma.tool.deleteMany({
    where: whereClause
  });
  
  revalidatePath(`/works/${workId}`);
  revalidatePath(`/works`);
}
