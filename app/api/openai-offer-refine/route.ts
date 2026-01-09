import { NextRequest, NextResponse } from "next/server";
import { refineOfferItems } from "@/actions/openai-offer-refine-actions";

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔧 [API] /api/openai-offer-refine called");

    const body = await request.json();
    const { refinementRequest, offerId, requirementId, existingItems } = body;

    console.log("📋 [API] Request parameters:", {
      offerId,
      requirementId,
      itemsCount: existingItems?.length || 0,
      requestLength: refinementRequest?.length || 0,
    });

    if (!refinementRequest || !offerId || !requirementId || !existingItems) {
      console.error("❌ [API] Missing required parameters");
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    console.log("🚀 [API] Calling refineOfferItems server action...");
    const result = await refineOfferItems({
      refinementRequest,
      offerId,
      requirementId,
      existingItems,
    });

    if (!result.success) {
      console.error("❌ [API] Server action failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to refine offer items",
        },
        { status: 500 }
      );
    }

    console.log("✅ [API] Server action successful");
    console.log("  ├─ Offer ID:", result.offerId);
    console.log("  └─ Requirement ID:", result.requirementId);

    return NextResponse.json({
      success: true,
      offerId: result.offerId,
      requirementId: result.requirementId,
      offer: result.offer,
    });
  } catch (error) {
    console.error("❌ [API] Error in /api/openai-offer-refine:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
