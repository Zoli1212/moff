import { NextRequest, NextResponse } from "next/server";
import { runDailyMaterialPriceCheck } from "@/actions/material-price-checker";

export async function GET(req: NextRequest) {
  try {
    // Check for authorization header (cron secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting daily material price check cron job...");

    const result = await runDailyMaterialPriceCheck();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in daily price check cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST method
export async function POST(req: NextRequest) {
  return GET(req);
}
