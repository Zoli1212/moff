"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma, Offer } from "@prisma/client";
import { parseOfferText, formatOfferForSave } from "@/lib/offer-parser";
import {
  OfferItem,
  OfferItemQuestion,
  OfferWithItems,
} from "@/types/offer.types";
import { v4 as uuidv4 } from "uuid";

// Using shared OfferWithItems type from @/types/offer.types

interface SaveOfferData {
  recordId: string;
  demandText: string;
  offerContent: string;
  checkedItems?: OfferItem[];
  extraRequirementText?: string; // Optional: extra requirement text to save as a block
  blockIds?: number[]; // Block IDs to update with the new requirement
  offerItemsQuestion?: OfferItemQuestion[];
  requirementId?: number;
  offerTitle?: string;
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
    const {
      recordId,
      demandText,
      offerContent,
      checkedItems,
      extraRequirementText,
      offerItemsQuestion, // Add default value and type annotation
      requirementId,
      offerTitle,
    }: SaveOfferData = data; // Add type annotation

    if (requirementId) {
      console.log("Received requirementId from client:", requirementId);
    }

    console.log("OfferTitle", offerTitle);

    // ... rest of the code remains the same ...
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
    console.log("OfferContent", offerContent, typeof offerContent, 'ENDRAW');
    try {
      parsedContent = JSON.parse(offerContent) as ParsedOfferContent;
    } catch (e) {
      console.log("OfferContent", offerContent, typeof offerContent, 'ENDTEXT');
      // If not valid JSON, try to parse as raw text
      parsedContent = formatOfferForSave(parseOfferText(offerContent));
    }

    // Merge with checked items if they exist
    if (checkedItems && checkedItems.length > 0 && parsedContent.items) {
      console.log("--- MERGE TEST LOG ---");
      console.log(
        "Original parsed items:",
        JSON.stringify(parsedContent.items, null, 2)
      );
      console.log(
        "Items from store (checkedItems):",
        JSON.stringify(checkedItems, null, 2)
      );

      // Egyedi kulcs csak a name és quantity alapján
      const createKey = (item: { name: string; quantity: string }) =>
        `${item.name}||${item.quantity}`;

      const checkedItemsMap = new Map(
        checkedItems.map((item) => [createKey(item), item])
      );

      const finalItems = parsedContent.items.map((originalItem) => {
        const key = createKey(originalItem);
        if (checkedItemsMap.has(key)) {
          const storeItem = checkedItemsMap.get(key)!;
          return { ...storeItem, totalPrice: storeItem.totalPrice ?? "0" };
        }
        return originalItem;
      });

      parsedContent.items = finalItems;
    }

    // If we have offerItemsQuestion, use it as the base and add any new items from parsedContent.items
    if (offerItemsQuestion && offerItemsQuestion.length > 0) {
      console.log("Merging offerItemsQuestion with parsedContent.items");

      // Ensure all items in offerItemsQuestion have required properties with defaults
      const normalizedOfferItems = offerItemsQuestion.map((item) => ({
        name: item.name || "",
        quantity: item.quantity || "1",
        unit: item.unit || "db",
        unitPrice: item.workUnitPrice || "0",
        materialUnitPrice: item.materialUnitPrice || "0",
        workTotal: item.workTotal || "0",
        materialTotal: item.materialTotal || "0",
        totalPrice: item.totalPrice || "0",
      }));

      // Create a Set of item names from offerItemsQuestion for quick lookup
      const existingItemNames = new Set(
        normalizedOfferItems.map((item) => item.name)
      );

      // Add items from parsedContent.items that don't exist in offerItemsQuestion
      const newItems = (parsedContent.items || [])
        .filter(
          (item: { name?: string }) =>
            item?.name && !existingItemNames.has(item.name)
        )
        .map((item) => ({
          name: item.name || "",
          quantity: "quantity" in item ? item.quantity : "1",
          unit: "unit" in item ? item.unit : "db",
          unitPrice: "unitPrice" in item ? item.unitPrice : "0",
          materialUnitPrice:
            "materialUnitPrice" in item ? item.materialUnitPrice : "0",
          workTotal: "workTotal" in item ? item.workTotal : "0",
          materialTotal: "materialTotal" in item ? item.materialTotal : "0",
          totalPrice: "totalPrice" in item ? item.totalPrice : "0",
        }));

      // Combine the arrays (offerItemsQuestion first, then new items)
      parsedContent.items = [...normalizedOfferItems, ...newItems];

      console.log(
        `Merged ${normalizedOfferItems.length} existing items with ${newItems.length} new items`
      );
      console.log("NormalizedOfferItems", normalizedOfferItems);
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

      console.log(existingWork, 'EXISTINGWORK')
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
    let latestRequirement = null;
    if (requirementId) {
      latestRequirement = await prisma.requirement.findUnique({
        where: { id: requirementId },
        select: { versionNumber: true, id: true, updateCount: true },
      });
    }
    if (!latestRequirement) {
      latestRequirement = await prisma.requirement.findFirst({
        where: {
          title: requirementTitle,
          myWorkId: work.id,
        },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true, id: true, updateCount: true },
      });
    }

    const newVersionNumber = latestRequirement
      ? latestRequirement.versionNumber + 1
      : 1;


    console.log(latestRequirement, 'LATESTREQUIREMENT', newVersionNumber)
    console.log(work.title, 'WORK TITLE')

    // Prepare requirement data
    const requirementData = {
      title: requirementTitle,
      description: demandText || "Ingatlan felújítási kérelem",
      versionNumber: newVersionNumber,
      status: "draft",
      myWork: {
        connect: { id: work.id },
      },
      updateCount: latestRequirement?.updateCount ?? 1,
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

    // 3. Update existing blocks to point to the new requirement
    if (data.blockIds && data.blockIds.length > 0) {
      console.log(
        `Updating ${data.blockIds.length} blocks to point to new requirement ${requirement.id}`
      );

      // Update all blocks to point to the new requirement
      try {
        await prisma.requirementItemsBlock.updateMany({
          where: { id: { in: data.blockIds } },
          data: { requirementId: requirement.id },
        });
        console.log(
          `Successfully updated ${data.blockIds.length} blocks to requirement ${requirement.id}`
        );
      } catch (error) {
        console.error("Error updating block references:", error);
        // Continue even if block updates fail
      }
    }

    // 4. Save extra requirement text as a block if it exists
    if (extraRequirementText?.trim()) {
      try {
        await prisma.requirementItemsBlock.create({
          data: {
            requirementId: requirement.id,
            blockText: extraRequirementText.trim(),
          },
        });
        console.log("Extra requirement text saved as block");
      } catch (error) {
        console.error("Error saving extra requirement block:", error);
        // Don't throw, continue with offer creation
      }
    }

    // 4. Create the Offer with the parsed content
    console.log("Preparing to create offer with recordId:", recordId);

    // Format notes for description if they exist
    const formattedNotes =
      parsedContent.notes && parsedContent.notes.length > 0
        ? parsedContent.notes.join("\n\n")
        : "Nincsenek megjegyzések";

    const offerData: any = {
      title: offerTitle || work.title,
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
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses[0].emailAddress;

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

    const userEmail =
      user.emailAddresses[0].emailAddress ||
      user.primaryEmailAddress?.emailAddress;
    console.log(`Fetching offer with ID: ${id} for user: ${userEmail}`);

    const offer = await prisma.offer.findFirst({
      where: {
        id,
        tenantEmail: userEmail,
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

    const userEmail =
      user.emailAddresses[0].emailAddress ||
      user.primaryEmailAddress?.emailAddress;
    console.log(
      `Updating items for offer ID: ${offerId} for user: ${userEmail}`,
      items
    );

    // First, verify the offer belongs to the current user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        tenantEmail: userEmail,
      },
      select: { id: true },
    });

    if (!existingOffer) {
      throw new Error(
        "Az ajánlat nem található vagy nincs jogosultságod a módosításához!"
      );
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
        tenantEmail: userEmail, // Ensure we only update if the offer belongs to the user
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

export async function updateOfferStatus(offerId: number, status: string) {

  console.log(offerId, 'OFFERID')
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, message: "Nincs bejelentkezve felhasználó!" };
    }

    // 1. Ellenőrizzük, hogy létezik-e már work ehhez az ajánlathoz
    const existingWork = await prisma.work.findFirst({
      where: { offerId }
    });

    // 2. Lekérjük az ajánlatot a requirementtel együtt
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        requirement: {
         
        }
      }
    });

    if (!offer) {
      return { success: false, message: "Az ajánlat nem található!" };
    }



    // 4. Tranzakció kezdete
    const result = await prisma.$transaction(async (tx) => {
      // 4.1. Frissítjük az ajánlat státuszát
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: { 
          status,
          updatedAt: new Date() 
        }
      });

      // 4.2. Munka státusz logika (logikai törlés/aktiválás)
      if (status === 'work') {
        if (existingWork) {
          // Ha már van work, csak aktiváljuk
          await tx.work.update({
            where: { id: existingWork.id },
            data: { isActive: true }
          });
        } else {
          // Ha nincs, mindig létrehozzuk
          const workTitle = offer.title || 'Új munka';
          await tx.work.create({
            data: {
              offerId: updatedOffer.id,
              status: 'pending',
              title: workTitle,
              offerDescription: offer.description || null,
              totalWorkers: 0,
              totalLaborCost: 0,
              totalTools: 0,
              totalToolCost: 0,
              totalMaterials:  0,
              totalMaterialCost: offer.materialTotal ? Number(offer.materialTotal) : 0,
              estimatedDuration: '0',
              progress: 0,
              tenantEmail: user.primaryEmailAddress?.emailAddress || '',
              offerItems: offer.items ? JSON.parse(JSON.stringify(offer.items)) : null,
              isActive: true
            }
          });
        }
      } else if (status === 'draft' && existingWork) {
        // Ha draftba állítjuk, csak logikailag inaktiváljuk
        await tx.work.update({
          where: { id: existingWork.id },
          data: { isActive: false }
        });
      }
      
      return updatedOffer;
    });

    // 5. Cache frissítése
    revalidatePath(`/dashboard/offers/${offerId}`);
    revalidatePath('/dashboard/offers');
    revalidatePath('/works');

    return { 
      success: true, 
      message: `Az ajánlat sikeresen ${status === 'work' ? 'munkába állítva' : 'frissítve'}!`,
      offer: result
    };
  } catch (error) {
    console.error("Hiba az állapot frissítésekor:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Ismeretlen hiba történt az állapot frissítésekor" 
    };
  }
}