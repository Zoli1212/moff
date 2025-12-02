// app/api/ai-demand-agent/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  console.log("\n🔍 [API /ai-demand-agent/status] Polling request");
  console.log("  ├─ eventId:", eventId);
  console.log("  └─ timestamp:", new Date().toISOString());

  if (!eventId) {
    console.error("  └─ ❌ Missing eventId");
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  try {
    const url = `${process.env.INNGEST_SERVER_HOST}/v1/events/${eventId}/runs`;
    console.log("  ├─ Calling Inngest API:", url);

    const result = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
      },
    });

    console.log("  ├─ Inngest response received");

    // Csak a fontos részeket logoljuk, ne az egész response-t (túl nagy!)
    const run = result.data?.data?.[0];
    console.log("  ├─ Response summary:", {
      hasData: !!result.data?.data,
      dataLength: result.data?.data?.length || 0,
      runId: run?.id,
      status: run?.status,
      hasOutput: !!run?.output,
      hasError: !!run?.error,
      startedAt: run?.started_at,
      endedAt: run?.ended_at,
    });

    const status = run?.status || "Unknown";

    console.log("  ├─ Extracted status:", status);

    if (status === "Completed") {
      console.log("  ├─ ✅ Run completed!");
      console.log("  └─ Output structure:", {
        hasOutput: !!run?.output,
        outputKeys: run?.output ? Object.keys(run.output) : [],
      });
    } else if (status === "Failed") {
      console.error("  ├─ ❌ Run failed!");
      console.error("  └─ Error:", run?.error);
    } else if (status === "Running" || status === "Queued") {
      console.log("  └─ ⏳ Still", status);
    } else {
      console.log("  └─ ⚠️ Unknown status:", status);
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("\n💥 [API /ai-demand-agent/status] Request failed");
    console.error("  ├─ Error:", (error as Error).message);
    console.error("  └─ Stack:", (error as Error).stack);
    return NextResponse.json(
      { error: `Failed to check run status: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
