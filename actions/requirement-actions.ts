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

export async function getRequirementById(requirementId: number) {
  try {
    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
      include: {
        myWork: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
    return requirement;
  } catch (error) {
    console.error("Error fetching requirement:", error);
    throw new Error("Hiba történt a követelmény betöltése közben");
  }
}

export async function getOffersByRequirementId(requirementId: number) {
  try {
    const offers = await prisma.offer.findMany({
      where: { requirementId },
      orderBy: { createdAt: "desc" },
    });

    // Parse items and notes for each offer
    return offers.map((offer) => {
      let items = [];
      let notes = [];

      try {
        if (Array.isArray(offer.items)) {
          // If items is already an array, use it directly
          items = offer.items;
          console.log("Items is already an array");
        } else if (typeof offer.items === "string") {
          // If items is a string, try to parse it as JSON
          items = offer.items ? JSON.parse(offer.items) : [];
          console.log("Parsed items from JSON string");
        } else {
          // Default to empty array if items is undefined or null
          items = [];
        }
      } catch (e) {
        console.error(
          "Error processing offer items:",
          e,
          "Items value:",
          offer.items
        );
        items = [];
      }

      try {
        notes = offer.notes ? JSON.parse(offer.notes as string) : [];
      } catch (e) {
        console.error("Error parsing offer notes:", e);
      }

      return {
        ...offer,
        items,
        notes,
      };
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    throw new Error("Hiba történt az ajánlatok betöltése közben");
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
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const requirement = await prisma.requirement.create({
      data: {
        title,
        description,
        myWorkId: workId,
        versionNumber: (latestVersion?.versionNumber || 0) + 1,
        status: "draft",
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

export async function updateRequirement(
  requirementId: number,
  data: {
    title?: string;
    description?: string;
    status?: string;
  }
) {
  try {
    const updatedRequirement = await prisma.requirement.update({
      where: { id: requirementId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.status && { status: data.status }),
        updatedAt: new Date(),
      },
      include: {
        myWork: true,
      },
    });

    // Revalidate the requirement page and related paths
    revalidatePath(`/offers/${requirementId}`);
    
    if (updatedRequirement.myWork) {
      revalidatePath(`/jobs/${updatedRequirement.myWork.id}/requirements`);
    }

    return { 
      success: true, 
      data: updatedRequirement,
    };
  } catch (error) {
    console.error("Error updating requirement:", error);
    return {
      success: false,
      error: "Hiba történt a követelmény frissítése közben",
    };
  }
}
