import { NextRequest, NextResponse } from "next/server";
import { supplementOfferWithInfo } from "@/actions/openai-offer-supplement-actions";

export async function POST(request: NextRequest) {
  try {
    console.log("\n📝 [API] /api/openai-offer-supplement called");

    const body = await request.json();
    const { supplementInfo, offerId, requirementId } = body;

    console.log("📋 [API] Request parameters:", {
      offerId,
      requirementId,
      supplementInfoLength: supplementInfo?.length || 0,
    });

    if (!supplementInfo || !offerId || !requirementId) {
      console.error("❌ [API] Missing required parameters");
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    console.log("🚀 [API] Calling supplementOfferWithInfo server action...");
    const result = await supplementOfferWithInfo({
      supplementInfo,
      offerId,
      requirementId,
    });

    if (!result.success) {
      console.error("❌ [API] Server action failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to supplement offer",
        },
        { status: 500 }
      );
    }

    console.log("✅ [API] Server action successful");
    console.log("  ├─ New Requirement ID:", result.requirementId);
    console.log("  └─ New Offer ID:", result.offerId);

    return NextResponse.json({
      success: true,
      offerId: result.offerId,
      requirementId: result.requirementId,
      offer: result.offer,
    });
  } catch (error) {
    console.error("❌ [API] Error in /api/openai-offer-supplement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
