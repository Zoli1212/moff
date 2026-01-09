import { NextRequest, NextResponse } from "next/server";
import { updateOfferFromAnswers } from "@/actions/openai-offer-update-actions";

export async function POST(req: NextRequest) {
  console.log("\n" + "=".repeat(80));
  console.log(" [OpenAI Offer Update] STARTED - Questions Answered");
  console.log("=".repeat(80));

  try {
    const {
      userInput,
      existingItems = [],
      answeredQuestions = [],
      requirementId,
      currentOfferId,
    } = await req.json();

    console.log("\n [STEP 1] Parsing request data...");
    console.log("  ├─ userInput length:", userInput?.length || 0, "chars");
    console.log("  ├─ existingItems:", existingItems.length, "items");
    console.log(
      "  ├─ answeredQuestions:",
      answeredQuestions.length,
      "questions"
    );
    console.log("  ├─ requirementId:", requirementId);
    console.log("  └─ currentOfferId:", currentOfferId);

    if (!userInput) {
      console.error(" [ERROR] userInput is missing!");
      return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
    }

    if (!existingItems || existingItems.length === 0) {
      console.error(" [ERROR] existingItems is missing or empty!");
      return NextResponse.json(
        {
          error:
            "Missing existingItems - this endpoint is only for updating existing offers",
        },
        { status: 400 }
      );
    }

    if (!requirementId || !currentOfferId) {
      console.error(" [ERROR] requirementId or currentOfferId is missing!");
      return NextResponse.json(
        { error: "Missing requirementId or currentOfferId" },
        { status: 400 }
      );
    }

    console.log(" [STEP 1] Request data valid");

    // Call server action
    console.log("\n [STEP 2] Calling server action...");
    const result = await updateOfferFromAnswers({
      userInput,
      existingItems,
      answeredQuestions,
      requirementId,
      currentOfferId,
    });

    if (!result.success) {
      console.error(" Server action failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log("✅ [STEP 2] Server action completed");
    console.log("\n✅ [SUCCESS] Offer updated successfully");
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
        error: "Failed to update offer",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
