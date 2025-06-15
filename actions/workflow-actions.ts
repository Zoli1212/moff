'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Get all workflows for the current user
export async function getWorkflows() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  return await prisma.workflow.findMany({
    where: { tenantEmail: user.email },
    include: {
      WorkflowSpecialty: {
        include: {
          specialty: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });
}

// Get workflows by specialty for the current user
export async function getWorkflowsBySpecialty(specialtyId: number) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: user.email
    }
  });

  if (!specialty) {
    throw new Error('Specialty not found or access denied');
  }

  return await prisma.workflow.findMany({
    where: {
      WorkflowSpecialty: {
        some: {
          specialtyId: specialtyId
        }
      },
      tenantEmail: user.email
    },
    orderBy: { name: 'asc' }
  });
}

// Create a new workflow
export async function createWorkflow(name: string, description: string, specialtyId: number) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: user.email
    }
  });

  if (!specialty) {
    throw new Error('Specialty not found or access denied');
  }

  return await prisma.workflow.create({
    data: {
      name,
      description,
      tenantEmail: user.email,
      WorkflowSpecialty: {
        create: {
          specialty: {
            connect: { id: specialtyId }
          }
        }
      }
    },
    include: {
      WorkflowSpecialty: true
    }
  });
}

// Update a workflow
export async function updateWorkflow(id: number, data: { name: string; description?: string }) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      tenantEmail: user.email
    }
  });

  if (!workflow) {
    throw new Error('Workflow not found or access denied');
  }

  return await prisma.workflow.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description
    }
  });
}

// Delete a workflow
export async function deleteWorkflow(id: number) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      tenantEmail: user.email
    }
  });

  if (!workflow) {
    throw new Error('Workflow not found or access denied');
  }

  // Delete the workflow (cascading deletes will handle related records)
  return await prisma.workflow.delete({
    where: { id }
  });
}
