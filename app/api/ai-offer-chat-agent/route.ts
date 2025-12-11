import { inngest } from "@/inngest/client";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    // Generálunk egy egyedi recordId-t az ajánlathoz
    const recordId = uuidv4();

    // Elindítjuk az Inngest function-t
    await inngest.send({
      name: "AiOfferAgent",
      data: {
        userInput: userInput,
        recordId: recordId,
      },
    });

    // Azonnal visszaadjuk a recordId-t
    // A frontend ezt használja majd a polling-hoz
    return NextResponse.json({
      success: true,
      recordId: recordId,
      message:
        "Offer generation started. Poll /api/offer-status?recordId=... to check progress.",
    });
  } catch (error) {
    console.error("❌ Route error:", error);
    return NextResponse.json(
      {
        error: "Failed to start offer generation",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
