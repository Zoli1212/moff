"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

// Get all workflows for the current user
export async function getWorkflows() {
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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

// --- WORKER JSON ARRAY ACTIONS ---
// Remove a worker from the workers JSON array by name and email
export async function removeWorkerFromJsonArray({
  workerId,
  workId,
  name,
  email
}: {
  workerId: number;
  workId: number;
  name: string;
  email: string;
}) {
  const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

  // Fetch the worker record and check ownership
  const worker = await prisma.worker.findFirst({
    where: {
      id: workerId,
      workId,
      work: { tenantEmail: userEmail },
    },
  });
  if (!worker) throw new Error("Worker not found or access denied");

  // Parse current workers array
  let workersArr: any[] = Array.isArray(worker.workers) ? worker.workers : [];
  // Remove the worker by name and email
  workersArr = workersArr.filter(
    (w) => !(w.name === name && w.email === email)
  );

  // Update the record
  const updated = await prisma.worker.update({
    where: { id: workerId },
    data: { workers: workersArr },
  });
  // Revalidate work pages so UI (slots/registry) refreshes immediately
  try {
    revalidatePath("/works");
    revalidatePath(`/works/${workId}`);
    revalidatePath(`/supply/${workId}`);
  } catch (_) {
    // no-op
  }
  return updated;
}

