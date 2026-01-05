import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json({ error: "workId is required" }, { status: 400 });
    }

    const { tenantEmail, user } = await getTenantSafeAuth();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || tenantEmail;

    // Fetch work with materials
    const work = await prisma.work.findUnique({
      where: { id: Number(workId) },
      select: {
        id: true,
        tenantEmail: true,
        materials: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
            availableFull: true,
            availableQuantity: true,
            workItemId: true,
          },
        },
        workItems: {
          select: {
            id: true,
            inProgress: true,
            materialUnitPrice: true,
            currentMarketPrice: true,
          },
        },
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Security check
    const isTenant = work.tenantEmail === tenantEmail;
    const isAssignedWorker = await prisma.workItemWorker.findFirst({
      where: {
        workId: Number(workId),
        email: userEmail,
      },
    });

    if (!isTenant && !isAssignedWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Filter only materials for in-progress workItems with materialUnitPrice > 0
    const inProgressWorkItemIds = work.workItems
      .filter((wi) => wi.inProgress && wi.materialUnitPrice && wi.materialUnitPrice > 0)
      .map((wi) => wi.id);

    const filteredMaterials = work.materials
      .filter((mat) => inProgressWorkItemIds.includes(mat.workItemId))
      .map((mat) => {
        // Get the workItem's price data
        const workItem = work.workItems.find((wi) => wi.id === mat.workItemId);
        return {
          id: mat.id,
          name: mat.name,
          quantity: mat.quantity,
          unit: mat.unit,
          availableFull: mat.availableFull,
          availableQuantity: mat.availableQuantity,
          workItemId: mat.workItemId,
          materialUnitPrice: workItem?.materialUnitPrice || 0,
          currentMarketPrice: workItem?.currentMarketPrice,
        };
      });

    // Aggregate materials by name (same logic as MaterialSlotsSection)
    const aggregatedMaterials = filteredMaterials.reduce((acc, mat) => {
      const existingIndex = acc.findIndex(
        (item) => item.name.toLowerCase() === mat.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        // Sum quantities if same name exists
        acc[existingIndex] = {
          ...acc[existingIndex],
          quantity: acc[existingIndex].quantity + mat.quantity,
          availableQuantity:
            (acc[existingIndex].availableQuantity ?? 0) +
            (mat.availableQuantity ?? 0),
          // Keep track of all workItemIds
          workItemIds: [
            ...(acc[existingIndex].workItemIds || [acc[existingIndex].workItemId]),
            mat.workItemId,
          ],
          availableFull:
            (acc[existingIndex].availableQuantity ?? 0) +
              (mat.availableQuantity ?? 0) >=
            acc[existingIndex].quantity + mat.quantity,
        };
      } else {
        // Add new material
        acc.push({
          ...mat,
          workItemIds: [mat.workItemId],
        });
      }

      return acc;
    }, [] as any[]);

    return NextResponse.json({ materials: aggregatedMaterials }, { status: 200 });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
