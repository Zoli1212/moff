"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

interface ConvertOfferParams {
  title: string;
  location: string;
  customerName: string;
  estimatedTime: string;
  description: string;
  offerSummary: string;
  totalPrice: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    description?: string;
  }>;
  notes: string[];
}

export async function convertExistingOfferToMyWork(params: ConvertOfferParams) {
  console.log("\n🚀 [convertExistingOfferToMyWork] STARTED");

  try {
    const { tenantEmail } = await getTenantSafeAuth();

    console.log("\n💾 [STEP 1] Creating MyWork entry...");

    // MyWork title: "Munka neve - Helyszín"
    const myWorkTitle = params.location
      ? `${params.title} - ${params.location}`
      : params.title;

    const myWork = await prisma.myWork.create({
      data: {
        title: myWorkTitle,
        location: params.location || '',
        customerName: params.customerName || 'Új ügyfél',
        date: new Date(),
        time: params.estimatedTime || '1-2 nap',
        totalPrice: params.totalPrice || 0,
        tenantEmail,
      },
    });

    console.log("  ├─ MyWork created:", myWork.id);

    console.log("\n💾 [STEP 2] Creating Requirement...");

    // Requirement description tartalmazza, hogy meglévő offerből lett konvertálva
    const requirementDescription = `Meglévő ajánlatból konvertálva.\n\n${params.description || ''}`;

    const requirement = await prisma.requirement.create({
      data: {
        title: `Követelmény - ${params.title}`,
        description: requirementDescription,
        myWorkId: myWork.id,
        versionNumber: 1,
        updateCount: 1,
        questionCount: 0,
      },
    });

    console.log("  ├─ Requirement created:", requirement.id);

    console.log("\n💾 [STEP 3] Creating Offer with items...");

    const offer = await prisma.offer.create({
      data: {
        title: params.title,
        status: 'draft',
        requirementId: requirement.id,
        tenantEmail,
        totalPrice: params.totalPrice || 0,
        description: params.description || '',
        offerSummary: params.offerSummary || null,
        notes: params.notes && params.notes.length > 0 ? params.notes.join("\n\n") : null,
        items: params.items as any, // Store items as JSON
      },
    });

    console.log("  ├─ Offer created:", offer.id);
    console.log("  └─ Items created:", params.items.length);

    console.log("\n✅ [convertExistingOfferToMyWork] SUCCESS");

    return {
      success: true,
      myWorkId: myWork.id,
      requirementId: requirement.id,
      offerId: offer.id,
    };
  } catch (error) {
    console.error("\n❌ [convertExistingOfferToMyWork] ERROR:", error);
    throw error;
  }
}
