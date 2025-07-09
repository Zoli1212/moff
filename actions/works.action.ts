"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

// Get all workflows for the current user
export async function getWorkflows() {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Nincs bejelentkezve felhasználó!");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) {
    throw new Error("Nem található email cím a felhasználóhoz!");
  }

  return await prisma.workflow.findMany({
    where: {
      tenantEmail: userEmail,
      WorkflowSpecialty: {
        some: {
          specialty: {
            tenantEmail: userEmail,
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
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Nincs bejelentkezve felhasználó!");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) {
    throw new Error("Nem található email cím a felhasználóhoz!");
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: userEmail,
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
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Nincs bejelentkezve felhasználó!");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) {
    throw new Error("Nem található email cím a felhasználóhoz!");
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id: specialtyId,
      tenantEmail: userEmail,
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
      tenantEmail: userEmail,
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
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Nincs bejelentkezve felhasználó!");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) {
    throw new Error("Nem található email cím a felhasználóhoz!");
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      tenantEmail: userEmail,
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
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Nincs bejelentkezve felhasználó!");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) {
    throw new Error("Nem található email cím a felhasználóhoz!");
  }

  // Verify the workflow belongs to the user
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      tenantEmail: userEmail,
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
