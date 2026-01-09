"use server";

import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

interface SupplementOfferParams {
  supplementInfo: string;
  offerId: number;
  requirementId: number;
}

export async function supplementOfferWithInfo({
  supplementInfo,
  offerId,
  requirementId,
}: SupplementOfferParams) {
  try {
    console.log("\n📝 [SUPPLEMENT] Starting offer supplementation...");
    console.log("  ├─ Old Offer ID:", offerId);
    console.log("  ├─ Old Requirement ID:", requirementId);
    console.log("  └─ Supplement info:", supplementInfo);

    const { tenantEmail } = await getTenantSafeAuth();

    // STEP 1: Fetch existing Offer and Requirement
    console.log("\n📋 [STEP 1] Fetching existing Offer and Requirement...");
    const existingOffer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { requirement: true },
    });

    if (!existingOffer) {
      throw new Error("Offer not found");
    }

    const existingRequirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { myWork: true },
    });

    if (!existingRequirement) {
      throw new Error("Requirement not found");
    }

    console.log("✅ [STEP 1] Offer and Requirement fetched");

    // STEP 2: Build combined user input
    console.log("\n📝 [STEP 2] Building combined user input...");
    const combinedInput = `${existingRequirement.description}

Kiegészítő információ:
${supplementInfo}

FONTOS UTASÍTÁSOK:
1. Ha a kiegészítő információban szerepel "ügyfél által biztosított" vagy "ügyfél biztosítja" vagy hasonló kifejezés, akkor azt az anyagot NEM kell beletenni az ajánlatba (mert már megvan az ügyfélnek)
2. Ha új anyagárak vagy termékárak szerepelnek (pl. "Zuhanyzó 150000 Ft", "WC 50000 Ft", "Kád 170000 Ft"), akkor KÖTELEZŐEN:
   - Hozz létre KÜLÖN tételeket ezekre az ANYAGOKRA (pl. "Zuhanyzó", "WC", "Kád")
   - Az anyag egységárát állítsd be a megadott értékre
   - A munka egységár legyen 0 Ft (mivel ez csak az anyag beszerzése)
   - Hozz létre KÜLÖN tételeket a BEÉPÍTÉSRE/SZERELÉSRE is (pl. "Zuhanyzó felszerelése", "WC bekötése")
3. Ha új csempeméret van megadva (pl. "90x90 cm"), használd ezt a méretet a tételekben és hozz létre külön tételeket a csempékre is
4. Ha ármódosítás van (pl. "a kád ára 170000"), akkor frissítsd a meglévő tétel árát
5. MINDIG hozz létre külön tételeket az anyagokra (Zuhanyzó, WC, Kád, Csempe, stb.) és külön tételeket a munkákra (felszerelés, bekötés, ragasztás, stb.)`;
    console.log("✅ [STEP 2] Combined input built");

    // STEP 3: Call the original offer generation logic
    console.log("\n🤖 [STEP 3] Calling OpenAI to generate new offer...");

    // Import the original offer generation function
    const { createOfferFromText } = await import("./openai-offer-actions");

    const result = await createOfferFromText({
      userInput: combinedInput,
      existingItems: [],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to generate new offer");
    }

    console.log("✅ [STEP 3] New offer generated");
    console.log("  ├─ New Requirement ID:", result.requirementId);
    console.log("  └─ New Offer ID:", result.offerId);

    // STEP 4: Update new Requirement with previousRequirementId
    console.log(
      "\n🔗 [STEP 4] Updating new Requirement with previousRequirementId..."
    );

    const updatedRequirement = await prisma.requirement.update({
      where: { id: result.requirementId },
      data: {
        previousRequirementId: requirementId,
        versionNumber: existingRequirement.versionNumber + 1,
        updateCount: existingRequirement.updateCount + 1,
      },
    });

    console.log("✅ [STEP 4] Requirement updated");
    console.log(
      "  ├─ Previous Requirement ID:",
      updatedRequirement.previousRequirementId
    );
    console.log("  ├─ Version Number:", updatedRequirement.versionNumber);
    console.log("  └─ Update Count:", updatedRequirement.updateCount);

    // STEP 5: Delete old offer
    console.log("\n🗑️ [STEP 5] Deleting old offer...");
    await prisma.offer.delete({
      where: { id: offerId },
    });
    console.log("✅ [STEP 5] Old offer deleted");

    console.log("\n✅ [SUCCESS] Offer supplemented successfully");
    console.log("  ├─ Old Requirement ID:", requirementId);
    console.log("  ├─ New Requirement ID:", result.requirementId);
    console.log("  ├─ Old Offer ID:", offerId, "(deleted)");
    console.log("  └─ New Offer ID:", result.offerId);

    return {
      success: true,
      offerId: result.offerId,
      requirementId: result.requirementId,
      offer: result.offer,
    };
  } catch (error) {
    console.error("❌ [SUPPLEMENT] Error supplementing offer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
