"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma, Offer } from "@prisma/client";
import { parseOfferText, formatOfferForSave } from "@/lib/offer-parser";
import { OfferItem, OfferWithItems } from "@/types/offer.types";
import { v4 as uuidv4 } from "uuid";

// Using shared OfferWithItems type from @/types/offer.types

interface SaveOfferData {
  recordId: string;
  demandText: string;
  offerContent: string;
  checkedItems?: OfferItem[];
}

interface ParsedOfferContent {
  title?: string;
  location?: string;
  totalPrice?: number;
  items?: Array<{
    name: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    materialUnitPrice: string;
    workTotal: string;
    materialTotal: string;
    totalPrice: string;
  }>;
  notes?: string[];
}

export async function saveOfferWithRequirements(data: SaveOfferData) {
  try {
        const { recordId, demandText, offerContent, checkedItems } = data;

    // Check if an offer with this recordId already exists
    if (recordId) {
      const existingOffer = await prisma.offer.findFirst({
        where: { recordId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          requirement: {
            select: { id: true },
          },
        },
      });

      if (existingOffer) {
        console.warn("Offer with this recordId already exists:", {
          id: existingOffer.id,
          title: existingOffer.title,
          createdAt: existingOffer.createdAt,
        });
        return {
          success: true, // Change to true since the offer exists
          error: "",
          offerId: existingOffer.id,
          requirementId: existingOffer.requirement?.id || null,
        };
      }
    }

    // Parse the offer content (could be JSON or raw text)
    let parsedContent: ParsedOfferContent;
    try {
      parsedContent = JSON.parse(offerContent) as ParsedOfferContent;
    } catch (e) {
      // If not valid JSON, try to parse as raw text
            parsedContent = formatOfferForSave(parseOfferText(offerContent));
    }

        // Merge with checked items if they exist
    if (checkedItems && checkedItems.length > 0 && parsedContent.items) {
      console.log("--- MERGE TEST LOG ---");
      console.log("Original parsed items:", JSON.stringify(parsedContent.items, null, 2));
      console.log("Items from store (checkedItems):", JSON.stringify(checkedItems, null, 2));

      const checkedItemsMap = new Map(checkedItems.map(item => [item.name, item]));

      const finalItems = parsedContent.items.map(originalItem => {
        // If an item with the same name exists in the store, use the store's version.
        if (checkedItemsMap.has(originalItem.name)) {
          const storeItem = checkedItemsMap.get(originalItem.name)!;
          // Ensure totalPrice is not undefined to satisfy the type checker.
          return { ...storeItem, totalPrice: storeItem.totalPrice ?? '0' };
        }
        // Otherwise, keep the original item.
        return originalItem;
      });

      parsedContent.items = finalItems;
    }

    console.log("PARSED CONTENT", parsedContent);
    console.log("ITEMS", parsedContent.items || parsedContent.notes);

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";
    const emailToUse = userEmail;

    if (!emailToUse) {
      throw new Error("No email available for tenant");
    }

    // Extract title, customer name, and time from offer content
    let title = "Új ajánlat";
    let customerName = "Ügyfél";
    let estimatedTime = "00:00";

    const lines = offerContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    // Get title from line starting with #
    const titleLine = lines.find((line) => line.startsWith("#"));
    if (titleLine) {
      title = titleLine.substring(1).trim();
    } else if (parsedContent.title) {
      title = parsedContent.title;
    }

    // Get customer name from line starting with 'Kedves'
    const greetingLine = lines.find((line) => line.startsWith("Kedves"));
    if (greetingLine) {
      // Extract the name after 'Kedves' and before '!'
      const nameMatch = greetingLine.match(/Kedves\s+([^!]+)/);
      if (nameMatch && nameMatch[1]) {
        customerName = nameMatch[1].trim();
      }
    }

    // Get estimated time from line containing 'Becsült kivitelezési idő:'
    const timeLine = lines.find((line) =>
      line.includes("Becsült kivitelezési idő:")
    );
    if (timeLine) {
      const timeMatch = timeLine.match(
        /Becsült kivitelezési idő:\s*([\d-]+)\s*nap/
      );
      if (timeMatch && timeMatch[1]) {
        estimatedTime = timeMatch[1].trim() + " nap";
      }
    }

    // 1. Check if work with this title already exists
    const existingWork = await prisma.myWork.findFirst({
      where: {
        title,
        tenantEmail: emailToUse,
      },
      select: {
        id: true,
        title: true,
      },
    });

    let work;

    if (existingWork) {
      // Use existing work
      work = existingWork;
    } else {
      const finalTitle = title && title.trim() !== "" ? title : uuidv4();
      // Create new work record if it doesn't exist
      work = await prisma.myWork.create({
        data: {
          title: finalTitle,
          customerName,
          date: new Date(),
          location: title || parsedContent.location || "Nincs megadva",
          time: estimatedTime,
          totalPrice: parsedContent.totalPrice || 0,
          tenantEmail: emailToUse,
        } as Prisma.MyWorkCreateInput,
      });
    }

    // 2. Create or update Requirement with versioning
    const requirementTitle =
      `Követelmény - ${work.title}` ||
      customerName ||
      parsedContent.title ||
      "Új ajánlat";

    // Find the latest version of this requirement
    const latestRequirement = await prisma.requirement.findFirst({
      where: {
        title: requirementTitle,
        myWorkId: work.id,
        
      },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true, id: true, updateCount: true },
    });

    const newVersionNumber = latestRequirement
      ? latestRequirement.versionNumber + 1
      : 1;

    // Prepare requirement data
    const requirementData = {
      title: requirementTitle,
      description: demandText || "Ingatlan felújítási kérelem",
      versionNumber: newVersionNumber,
      status: "draft",
      myWork: {
        connect: { id: work.id },
      },
      updateCount: (latestRequirement?.updateCount ?? 1),
      // Link to previous version if it exists
      ...(latestRequirement && {
        previousVersion: {
          connect: { id: latestRequirement.id },
        },
      }),
    };

    console.log(
      "Creating requirement with data:",
      JSON.stringify(requirementData, null, 2)
    );

    // Create new version of the requirement
    const requirement = await prisma.requirement.create({
      data: requirementData as Prisma.RequirementCreateInput,
    });

    // Update the previous version to point to this new version
    if (latestRequirement) {
      await prisma.requirement.update({
        where: { id: latestRequirement.id },
        data: {
          nextVersions: {
            connect: { id: requirement.id },
          },
        },
      });
    }

    // 3. Create the Offer with the parsed content
    console.log("Preparing to create offer with recordId:", recordId);

    // Format notes for description if they exist
    const formattedNotes =
      parsedContent.notes && parsedContent.notes.length > 0
        ? parsedContent.notes.join("\n\n")
        : "Nincsenek megjegyzések";

    const offerData: any = {
      title: work.title,
      description: formattedNotes, // Save formatted notes in the description
      totalPrice: parsedContent.totalPrice || 0,
      status: "draft",
      requirement: {
        connect: { id: requirement.id },
      },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdBy: emailToUse,
      tenantEmail: emailToUse, // Add tenantEmail to ensure it's saved with the offer
    };

    // Add recordId if it exists
    if (recordId) {
      offerData.recordId = recordId;
    }

    // Log the data we're about to save
    console.log("Offer data to be saved:", {
      title: offerData.title,
      totalPrice: offerData.totalPrice,
      requirementId: requirement.id,
      hasRecordId: !!recordId,
      recordId: recordId || "N/A",
      hasItems: !!(parsedContent.items && parsedContent.items.length > 0),
      itemCount: parsedContent.items?.length || 0,
      hasNotes: !!(parsedContent.notes && parsedContent.notes.length > 0),
      noteCount: parsedContent.notes?.length || 0,
      descriptionPreview: formattedNotes.substring(0, 100) + "...",
    });

    // Add items if they exist
    if (parsedContent.items && parsedContent.items.length > 0) {
      console.log(`Adding ${parsedContent.items.length} items to offer`);
      offerData.items = JSON.stringify(parsedContent.items);
      console.log("Items JSON:", offerData.items);
    } else {
      console.log("No items to add to offer");
      offerData.items = "[]"; // Ensure it's a valid empty array JSON string
    }

    // Add notes as JSON if they exist (for structured data)
    if (parsedContent.notes && parsedContent.notes.length > 0) {
      console.log(
        `Adding ${parsedContent.notes.length} notes to offer as JSON`
      );
      offerData.notes = JSON.stringify(parsedContent.notes);
    } else {
      console.log("No notes to add to offer");
    }

    try {
      const offer = await prisma.offer.create({
        data: offerData,
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          items: true,
          notes: true,
        },
      });

      console.log("Offer created successfully:", {
        id: offer.id,
        title: offer.title,
        recordId: recordId || "N/A",
        createdAt: offer.createdAt,
        hasItems: !!offer.items,
        hasNotes: !!offer.notes,
      });

      revalidatePath("/jobs");
      revalidatePath("/offers");

      return {
        success: true,
        workId: work.id,
        requirementId: requirement.id,
        offerId: offer.id,
        title: work.title,
      };
    } catch (error) {
      console.error("Error creating offer:", error);
      throw new Error("Hiba történt az ajánlat mentésekor");
    }
  } catch (error) {
    console.error("Error saving offer with requirements:", error);
    throw new Error("Hiba történt az ajánlat mentésekor");
  }
}

export async function getUserOffers() {
  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0].emailAddress;

    if (!userEmail) {
      throw new Error("No email available for user");
    }

    // First, get all works for the current user
    const works = await prisma.myWork.findMany({
      where: {
        tenantEmail: userEmail,
      },
      include: {
        requirements: {
          include: {
            offers: true,
          },
        },
      },
    });

    // Flatten the offers array from all requirements
    const offers = works.flatMap((work) =>
      work.requirements.flatMap((req) =>
        req.offers.map((offer) => ({
          ...offer,
          requirement: {
            id: req.id,
            title: req.title,
          },
        }))
      )
    );

    // Process items and notes for each offer
    return offers.map((offer) => ({
      ...offer,
      items: offer.items
        ? Array.isArray(offer.items)
          ? offer.items
          : JSON.parse(offer.items as string)
        : [],
      notes: offer.notes
        ? Array.isArray(offer.notes)
          ? offer.notes
          : [offer.notes as string]
        : [],
    }));
  } catch (error) {
    console.error("Error fetching user offers:", error);
    throw new Error("Failed to fetch user offers");
  }
}

export async function getOfferById(id: number) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Nincs bejelentkezve felhasználó!");
    }
    
    const userEmail = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress;
    console.log(`Fetching offer with ID: ${id} for user: ${userEmail}`);

    const offer = await prisma.offer.findFirst({
      where: { 
        id,
        tenantEmail: userEmail 
      },
      include: {
        requirement: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!offer) {
      console.log(`No offer found with ID: ${id} for user: ${userEmail}`);
      return null;
    }

    // Parse items and notes if they exist
    const items = offer.items ? JSON.parse(offer.items as string) : [];
    const notes = offer.notes ? JSON.parse(offer.notes as string) : [];

    // Log the parsed data for debugging
    console.log("Parsed offer data:", {
      id: offer.id,
      title: offer.title,
      itemsCount: items.length,
      notesCount: notes.length,
      hasRequirement: !!offer.requirement,
    });

    return {
      ...offer,
      items,
      notes,
    };
  } catch (error) {
    console.error("Error in getOfferById:", error);
    throw new Error("Hiba történt az ajánlat betöltésekor");
  }
}

export async function updateOfferItems(offerId: number, items: OfferItem[]) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Nincs bejelentkezve felhasználó!");
    }
    
    const userEmail = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress;
    console.log(`Updating items for offer ID: ${offerId} for user: ${userEmail}`, items);

    // First, verify the offer belongs to the current user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        tenantEmail: userEmail
      },
      select: { id: true }
    });

    if (!existingOffer) {
      throw new Error("Az ajánlat nem található vagy nincs jogosultságod a módosításához!");
    }

    // Calculate new totals
    const totals = items.reduce(
      (acc, item) => {
        const material =
          parseFloat(
            item.materialTotal.replace(/[^0-9,-]+/g, "").replace(",", ".")
          ) || 0;
        const work =
          parseFloat(
            item.workTotal.replace(/[^0-9,-]+/g, "").replace(",", ".")
          ) || 0;
        return {
          material: acc.material + material,
          work: acc.work + work,
          grandTotal: acc.grandTotal + material + work,
        };
      },
      { material: 0, work: 0, grandTotal: 0 }
    );

    const { material: materialTotal, work: workTotal, grandTotal } = totals;

    // Update the offer with new items and total price
    const updatedOffer = await prisma.offer.update({
      where: { 
        id: offerId,
        tenantEmail: userEmail // Ensure we only update if the offer belongs to the user
      },
      data: {
        items: items as unknown as Prisma.InputJsonValue, // Type-safe JSON serialization
        totalPrice: grandTotal,
        materialTotal: parseFloat(materialTotal.toFixed(2)),
        workTotal: parseFloat(workTotal.toFixed(2)),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        totalPrice: true,
        items: true,
        updatedAt: true,
      },
    });

    console.log("✅ Offer items updated successfully:", {
      id: updatedOffer.id,
      title: updatedOffer.title,
      totalPrice: updatedOffer.totalPrice,
      itemCount: items.length,
      updatedAt: updatedOffer.updatedAt,
    });

    // Revalidate the offers page to show updated data
    revalidatePath("/offers");

    return {
      success: true,
      offer: {
        ...updatedOffer,
        items: (() => {
          try {
            let items: any[] = [];
            if (Array.isArray(updatedOffer.items)) {
              items = updatedOffer.items;
            } else if (typeof updatedOffer.items === "string") {
              items = JSON.parse(updatedOffer.items);
            }

            // Validate and transform each item to match OfferItem
            return items.map(
              (item) =>
                ({
                  id: item.id,
                  name: item.name || "",
                  quantity: item.quantity || "0",
                  unit: item.unit || "db",
                  materialUnitPrice: item.materialUnitPrice || "0",
                  unitPrice: item.unitPrice || "0",
                  materialTotal: item.materialTotal || "0",
                  workTotal: item.workTotal || "0",
                  description: item.description || "",
                }) as OfferItem
            );
          } catch (error) {
            console.error("Error parsing offer items:", error);
            return [];
          }
        })(),
      },
    };
  } catch (error) {
    console.error("Error updating offer items:", error);
    return {
      success: false,
      error: "Hiba történt az ajánlat frissítésekor",
    };
  }
}
