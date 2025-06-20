'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Get phases for a workflow
export async function getPhases(workflowId: number) {
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
      id: workflowId,
      tenantEmail: user.email
    }
  });

  if (!workflow) {
    throw new Error('Workflow not found or access denied');
  }

  return await prisma.phase.findMany({
    where: { workflowId },
    include: {
      tasks: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { order: 'asc' }
  });
}

// Save phases and tasks for a workflow
export async function savePhases(workflowId: number, phases: Array<{
  name: string;
  order: number;
  tasks: Array<{
    name: string;
    isCompleted: boolean;
    order: number;
  }>;
}>) {
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
      id: workflowId,
      tenantEmail: user.email
    }
  });

  if (!workflow) {
    throw new Error('Workflow not found or access denied');
  }

  // Start a transaction to ensure data consistency
  return await prisma.$transaction(async (tx) => {
    // Delete existing phases and tasks for this workflow
    await tx.task.deleteMany({
      where: {
        phase: {
          workflowId: workflowId
        }
      }
    });

    await tx.phase.deleteMany({
      where: { workflowId }
    });

    // Create new phases and tasks
    const createdPhases = [];
    
    for (const phaseData of phases) {
      const { tasks, ...phase } = phaseData;
      
      const createdPhase = await tx.phase.create({
        data: {
          ...phase,
          workflowId,
          tenantEmail: user.email as string,
          tasks: {
            create: tasks.map(task => ({
              name: task.name,
              isCompleted: task.isCompleted,
              order: task.order,
              tenantEmail: user.email as string
            }))
          }
        },
        include: {
          tasks: true
        }
      });
      
      createdPhases.push(createdPhase);
    }

    return createdPhases;
  });
}

// Get a single phase with its tasks
export async function getPhase(phaseId: number) {
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

  // Get the phase with its workflow
  const phase = await prisma.phase.findFirst({
    where: { id: phaseId },
    include: {
      workflow: true,
      tasks: {
        orderBy: { order: 'asc' }
      }
    }
  });

  // Verify the workflow belongs to the user
  if (!phase || phase.workflow.tenantEmail !== user.email) {
    throw new Error('Phase not found or access denied');
  }

  return phase;
}

// Update a task's completion status
export async function updateTaskStatus(taskId: number, isCompleted: boolean) {
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

  // Get the task with its phase and workflow
  const task = await prisma.task.findFirst({
    where: { id: taskId },
    include: {
      phase: {
        include: {
          workflow: true
        }
      }
    }
  });

  // Verify the workflow belongs to the user
  if (!task || task?.phase?.workflow.tenantEmail !== user.email) {
    throw new Error('Task not found or access denied');
  }

  // Update the task status
  return await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted }
  });
}
