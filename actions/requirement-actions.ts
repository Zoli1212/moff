"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Requirement } from "@prisma/client";

export interface RequirementWithOffers extends Requirement {
  _count: {
    offers: number;
  };
}

export async function getRequirementsByWorkId(
  workId: number
): Promise<RequirementWithOffers[]> {
  try {
    const requirements = await prisma.requirement.findMany({
      where: {
        myWorkId: workId,
      },
      include: {
        _count: {
          select: {
            offers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return requirements as RequirementWithOffers[];
  } catch (error) {
    console.error("Error fetching requirements:", error);
    throw new Error("Hiba történt a követelmények betöltése közben");
  }
}

export async function createRequirement(
  workId: number,
  title: string,
  description: string
) {
  try {
    // First, get the latest version number for this work
    const latestVersion = await prisma.requirement.findFirst({
      where: { myWorkId: workId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const requirement = await prisma.requirement.create({
      data: {
        title,
        description,
        myWorkId: workId,
        versionNumber: (latestVersion?.versionNumber || 0) + 1,
        status: 'draft',
      },
    });

    revalidatePath(`/jobs/${workId}/requirements`);
    return { success: true, data: requirement };
  } catch (error) {
    console.error("Error creating requirement:", error);
    return {
      success: false,
      error: "Hiba történt a követelmény létrehozása közben",
    };
  }
}
