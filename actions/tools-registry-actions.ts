import { prisma } from "@/lib/prisma";
import type { ToolsRegistry } from '@prisma/client';
import { currentUser } from "@clerk/nextjs/server";


// List all tools for a company
export async function getToolsRegistryByTenant(): Promise<ToolsRegistry[]> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error('No tenant email found');
  return prisma.toolsRegistry.findMany({
    where: { tenantEmail },
    orderBy: { name: 'asc' },
  });
}

// Add a new tool to registry
export async function addToolToRegistry(name: string, quantity: number) {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error('No tenant email found');
  return prisma.toolsRegistry.create({
    data: {
      name,
      quantity,
      tenantEmail,
    },
  });
}

// Update tool quantity
export async function updateToolQuantity(registryId: number, quantity: number) {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error('No tenant email found');
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
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  const tenantEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!tenantEmail) throw new Error('No tenant email found');
  const tool = await prisma.toolsRegistry.findFirst({
    where: {
      name: toolName,
      tenantEmail
    }
  });
  return !!tool;
}
