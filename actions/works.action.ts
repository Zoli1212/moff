"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Get all workflows for the current user
export async function getWorkflows() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  return await prisma.workflow.findMany({
    where: {
      WorkflowSpecialty: {
        some: {
          specialty: {
            tenantEmail: user.email,
          },
        },
      },
    },
    include: {
      phases: {
        include: {
          tasks: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}

// Get workflows by specialty ID
export async function getWorkflowsBySpecialty(specialtyId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: user.email,
    },
  });

  if (!specialty) {
    throw new Error("Specialty not found or access denied");
  }

  return await prisma.workflow.findMany({
    where: {
      WorkflowSpecialty: {
        some: {
          specialtyId: specialtyId,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

// Create a new workflow
export async function createWorkflow(
  name: string,
  description: string,
  specialtyId: number
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: user.email,
    },
  });

  if (!specialty) {
    throw new Error("Specialty not found or access denied");
  }

  // Create the workflow and connect it to the specialty
  return await prisma.workflow.create({
    data: {
      name,
      description,
      tenantEmail: user.email,
      WorkflowSpecialty: {
        create: {
          specialtyId: specialtyId,
        },
      },
    },
  });
}

// Update a workflow
export async function updateWorkflow(
  workflowId: number,
  data: { name?: string; description?: string }
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      tenantEmail: user.email,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found or access denied");
  }

  return await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      name: data.name,
      description: data.description,
    },
  });
}

// Delete a workflow
export async function deleteWorkflow(workflowId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      tenantEmail: user.email,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found or access denied");
  }

  // Delete the workflow (cascading deletes will handle related records)
  return await prisma.workflow.delete({
    where: { id: workflowId },
  });
}
