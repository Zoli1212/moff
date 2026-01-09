import { NextRequest, NextResponse } from "next/server";
import { createOfferFromText } from "@/actions/openai-offer-actions";

export async function POST(req: NextRequest) {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 [OpenAI Offer] STARTED (Direct OpenAI - No Inngest)");
  console.log("=".repeat(80));

  try {
    const { userInput, existingItems = [] } = await req.json();

    console.log("\n📋 [STEP 1] Parsing request data...");
    console.log("  ├─ userInput length:", userInput?.length || 0, "chars");
    console.log("  └─ existingItems:", existingItems.length, "items");

    if (!userInput) {
      console.error("❌ [ERROR] userInput is missing!");
      return NextResponse.json(
        { error: "Missing userInput" },
        { status: 400 }
      );
    }

    console.log("✅ [STEP 1] Request data valid");

    // Call server action
    console.log("\n📞 [STEP 2] Calling server action...");
    const result = await createOfferFromText({
      userInput,
      existingItems,
    });

    if (!result.success) {
      console.error("❌ Server action failed:", result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log("✅ [STEP 2] Server action completed");
    console.log("\n✅ [SUCCESS] Offer created successfully");
    console.log("  ├─ Requirement ID:", result.requirementId);
    console.log("  ├─ Offer ID:", result.offerId);
    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      requirementId: result.requirementId,
      offerId: result.offerId,
      offer: result.offer,
    });
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to create offer",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
