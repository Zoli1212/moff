"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function updateGroupApproval(groupNo: number, approved: boolean) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Update all workDiaryItems with the same groupNo
    const result = await prisma.workDiaryItem.updateMany({
      where: {
        groupNo: groupNo,
        tenantEmail: tenantEmail
      },
      data: {
        accepted: approved,
        updatedAt: new Date()
      }
    });

    return { 
      success: true, 
      message: approved ? "Csoportos jóváhagyás sikeres" : "Csoportos jóváhagyás visszavonva",
      updatedCount: result.count
    };
  } catch (error) {
    console.error("Group approval error:", error);
    return { 
      success: false, 
      message: "Hiba történt a jóváhagyás során" 
    };
  }
}

export async function getGroupApprovalStatus(groupNo: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Get all workDiaryItems with the same groupNo
    const items = await prisma.workDiaryItem.findMany({
      where: {
        groupNo: groupNo,
        tenantEmail: tenantEmail
      }
    });

    if (items.length === 0) {
      return { success: false, message: "Nem találhatók bejegyzések" };
    }

    // Check if all items are approved
    const allApproved = items.every((item: any) => item.accepted === true);
    const someApproved = items.some((item: any) => item.accepted === true);

    return { 
      success: true, 
      allApproved,
      someApproved,
      totalItems: items.length,
      approvedItems: items.filter((item: any) => item.accepted === true).length
    };
  } catch (error) {
    console.error("Get group approval status error:", error);
    return { 
      success: false, 
      message: "Hiba történt az állapot lekérdezése során" 
    };
  }
}
