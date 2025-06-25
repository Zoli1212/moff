'use server';

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma } from '@prisma/client';
import { parseOfferText, formatOfferForSave } from '@/lib/offer-parser';

interface SaveOfferData {
  recordId: string;
  demandText: string;
  offerContent: string;

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
    totalPrice: string;
  }>;
  notes?: string[];
}

export async function saveOfferWithRequirements(data: SaveOfferData) {
  try {
    const { recordId, demandText, offerContent } = data;


    // Check if an offer with this recordId already exists
    if (recordId) {
      const existingOffer = await prisma.offer.findFirst({
        where: { recordId },
        select: { id: true, title: true, createdAt: true }
      });

      if (existingOffer) {
        console.warn('Offer with this recordId already exists:', {
          id: existingOffer.id,
          title: existingOffer.title,
          createdAt: existingOffer.createdAt
        });
        return {
          success: false,
          error: 'Már létezik ajánlat ezzel az azonosítóval',
          existingOfferId: existingOffer.id
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

    console.log("PARSED CONTENT", parsedContent);
    console.log("ITEMS", parsedContent.items || parsedContent.notes);

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || '';
    const emailToUse = userEmail;
    
    if (!emailToUse) {
      throw new Error('No email available for tenant');
    }
    
    // Extract title, customer name, and time from offer content
    let title = 'Új ajánlat';
    let customerName = 'Ügyfél';
    let estimatedTime = '00:00';
    
    const lines = offerContent.split('\n').map(line => line.trim()).filter(line => line);
    
    // Get title from line starting with #
    const titleLine = lines.find(line => line.startsWith('#'));
    if (titleLine) {
      title = titleLine.substring(1).trim();
    } else if (parsedContent.title) {
      title = parsedContent.title;
    }
    
    // Get customer name from line starting with 'Kedves'
    const greetingLine = lines.find(line => line.startsWith('Kedves'));
    if (greetingLine) {
      // Extract the name after 'Kedves' and before '!'
      const nameMatch = greetingLine.match(/Kedves\s+([^!]+)/);
      if (nameMatch && nameMatch[1]) {
        customerName = nameMatch[1].trim();
      }
    }

    // Get estimated time from line containing 'Becsült kivitelezési idő:'
    const timeLine = lines.find(line => line.includes('Becsült kivitelezési idő:'));
    if (timeLine) {
      const timeMatch = timeLine.match(/Becsült kivitelezési idő:\s*([\d-]+)\s*nap/);
      if (timeMatch && timeMatch[1]) {
        estimatedTime = timeMatch[1].trim() + ' nap';
      }
    }

    // 1. Check if work with this title already exists
    const existingWork = await prisma.myWork.findFirst({
      where: {
        title,
        tenantEmail: emailToUse
      },
      select: { 
        id: true,
        title: true
      }
    });

    let work;
    
    if (existingWork) {
      // Use existing work
      work = existingWork;
      console.log('Using existing work with title:', title);
    } else {
      // Create new work record if it doesn't exist
      work = await prisma.myWork.create({
        data: {
          title,
          customerName,
          date: new Date(),
          location: title || parsedContent.location || 'Nincs megadva',
          time: estimatedTime,
          totalPrice: parsedContent.totalPrice || 0,
          tenantEmail: emailToUse,
        } as Prisma.MyWorkCreateInput,
      });
      console.log('Created new work with title:', title);
    }

    // 2. Create or update Requirement with versioning
    const requirementTitle = `Követelmény - ${work.title}` || customerName || parsedContent.title || 'Új ajánlat';
    
    console.log('Creating requirement with title:', requirementTitle);
    console.log('Demand text length:', demandText?.length || 0);
    console.log('Demand text preview:', demandText?.substring(0, 100) + '...');
    
    // Find the latest version of this requirement
    const latestRequirement = await prisma.requirement.findFirst({
      where: {
        title: requirementTitle,
        myWorkId: work.id
      },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true, id: true }
    });

    const newVersionNumber = latestRequirement ? latestRequirement.versionNumber + 1 : 1;
    
    // Prepare requirement data
    const requirementData = {
      title: requirementTitle,
      description: demandText || 'Ingatlan felújítási kérelem',
      versionNumber: newVersionNumber,
      status: 'draft',
      myWork: {
        connect: { id: work.id }
      },
      // Link to previous version if it exists
      ...(latestRequirement && {
        previousRequirement: {
          connect: { id: latestRequirement.id }
        }
      })
    };
    
    console.log('Creating requirement with data:', JSON.stringify(requirementData, null, 2));
    
    // Create new version of the requirement
    const requirement = await prisma.requirement.create({
      data: requirementData as Prisma.RequirementCreateInput,
    });
    
    console.log('Requirement created with ID:', requirement.id);
    
    // Update the previous version to point to this new version
    if (latestRequirement) {
      console.log('Updating previous requirement', latestRequirement.id, 'to point to new version', requirement.id);
      await prisma.requirement.update({
        where: { id: latestRequirement.id },
        data: {
          nextVersions: {
            connect: { id: requirement.id }
          }
        }
      });
    }

    // 3. Create the Offer with the parsed content
    console.log('Preparing to create offer with recordId:', recordId);
    
    // Format notes for description if they exist
    const formattedNotes = parsedContent.notes && parsedContent.notes.length > 0 
      ? parsedContent.notes.join('\n\n')
      : 'Nincsenek megjegyzések';
    
    const offerData: any = {
      title: `Ajánlat - ${work.title}`,
      description: formattedNotes, // Save formatted notes in the description
      totalPrice: parsedContent.totalPrice || 0,
      status: 'draft',
      requirement: {
        connect: { id: requirement.id }
      },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdBy: emailToUse,
    };
    
    // Add recordId if it exists
    if (recordId) {
      offerData.recordId = recordId;
    }

    // Log the data we're about to save
    console.log('Offer data to be saved:', {
      title: offerData.title,
      totalPrice: offerData.totalPrice,
      requirementId: requirement.id,
      hasRecordId: !!recordId,
      recordId: recordId || 'N/A',
      hasItems: !!(parsedContent.items && parsedContent.items.length > 0),
      itemCount: parsedContent.items?.length || 0,
      hasNotes: !!(parsedContent.notes && parsedContent.notes.length > 0),
      noteCount: parsedContent.notes?.length || 0,
      descriptionPreview: formattedNotes.substring(0, 100) + '...',
    });

    // Add items if they exist
    if (parsedContent.items && parsedContent.items.length > 0) {
      console.log(`Adding ${parsedContent.items.length} items to offer`);
      offerData.items = parsedContent.items;
    } else {
      console.log('No items to add to offer');
    }

    // Add notes as JSON if they exist (for structured data)
    if (parsedContent.notes && parsedContent.notes.length > 0) {
      console.log(`Adding ${parsedContent.notes.length} notes to offer as JSON`);
      offerData.notes = JSON.stringify(parsedContent.notes);
    } else {
      console.log('No notes to add to offer');
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
          notes: true
        }
      });

      console.log('✅ Offer created successfully:', {
        id: offer.id,
        title: offer.title,
        recordId: recordId || 'N/A',
        createdAt: offer.createdAt,
        hasItems: !!offer.items,
        hasNotes: !!offer.notes
      });
      
      revalidatePath('/dashboard/offers');
      
      return {
        success: true,
        workId: work.id,
        requirementId: requirement.id,
        offerId: offer.id,
        title: work.title
      };
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      throw new Error('Hiba történt az ajánlat mentésekor');
    }
  } catch (error) {
    console.error('Error saving offer with requirements:', error);
    throw new Error('Hiba történt az ajánlat mentésekor');
  }
}
