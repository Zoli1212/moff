"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export interface UpdateWorkItemData {
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  completedQuantity?: number;
}

export async function updateWorkItemDetails(
  workItemId: number,
  updateData: UpdateWorkItemData
) {
  try {
    console.log("updateWorkItemDetails called with:", { workItemId, updateData });
    
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Verify the work item exists and belongs to the tenant
    const existingWorkItem = await prisma.workItem.findFirst({
      where: {
        id: workItemId,
        work: {
          tenantEmail: tenantEmail,
        },
      },
      include: {
        work: true,
      },
    });

    if (!existingWorkItem) {
      return {
        success: false,
        error: "A tétel nem található vagy nincs hozzáférési jogosultság",
      };
    }

    // Prepare update data - only include fields that are provided
    const updateFields: any = {};
    
    if (updateData.name !== undefined) {
      updateFields.name = updateData.name;
    }
    
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description;
    }
    
    if (updateData.quantity !== undefined) {
      updateFields.quantity = updateData.quantity;
    }
    
    if (updateData.unit !== undefined) {
      updateFields.unit = updateData.unit;
    }
    
    if (updateData.completedQuantity !== undefined) {
      updateFields.completedQuantity = updateData.completedQuantity;
    }

    console.log("updateFields prepared:", updateFields);

    // Calculate progress if both quantity and completedQuantity are available
    const finalQuantity = updateData.quantity !== undefined ? updateData.quantity : existingWorkItem.quantity;
    const finalCompletedQuantity = updateData.completedQuantity !== undefined ? updateData.completedQuantity : existingWorkItem.completedQuantity;
    
    if (finalQuantity && finalQuantity > 0 && finalCompletedQuantity !== undefined && finalCompletedQuantity !== null) {
      updateFields.progress = Math.min(100, Math.max(0, (finalCompletedQuantity / finalQuantity) * 100));
    }

    // Update the work item
    const updatedWorkItem = await prisma.workItem.update({
      where: {
        id: workItemId,
      },
      data: updateFields,
    });

    return {
      success: true,
      data: updatedWorkItem,
    };
  } catch (error) {
    console.error("Error updating work item details:", error);
    return {
      success: false,
      error: "Hiba történt a tétel frissítése során",
    };
  }
}
