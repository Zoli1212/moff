import { inngest } from "@/inngest/client";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("\n" + "=".repeat(80));
  console.log(" [API /ai-offer-chat-agent] Request received");
  console.log("=".repeat(80));
  console.log(" Timestamp:", new Date().toISOString());

  try {
    const { userInput } = await req.json();
    console.log(" Request body parsed:");
    console.log("  ├─ userInput length:", userInput?.length || 0, "chars");
    console.log(
      "  └─ userInput preview:",
      userInput?.substring(0, 100) + "..."
    );

    console.log("\n [STEP 1] Sending event to Inngest...");
    console.log("  ├─ Event name: AiOfferAgent");
    console.log("  └─ Sending...");

    const resultIds = await inngest.send({
      name: "AiOfferAgent",
      data: {
        userInput: userInput,
      },
    });

    const runId = resultIds?.ids[0];
    console.log("  ├─ Event sent successfully");
    console.log("  └─ Run ID:", runId);
    console.log(" [STEP 1] Inngest event triggered");

    console.log("\n [STEP 2] Polling for completion...");
    let runStatus;
    let pollCount = 0;
    const maxPolls = 120; // 60 seconds max (120 * 500ms)

    while (pollCount < maxPolls) {
      pollCount++;

      if (pollCount % 10 === 0) {
        console.log(`  ├─ Poll #${pollCount} (${pollCount * 0.5}s elapsed)...`);
      }

      runStatus = await getRuns(runId);
      const status = runStatus?.data[0]?.status;

      if (status === "Completed") {
        console.log(`  ├─ Status: ${status} (after ${pollCount * 0.5}s)`);
        console.log("  └─ Run completed successfully");
        console.log(" [STEP 2] Polling complete - Success");
        break;
      }

      if (status === "Cancelled") {
        console.error(`  ├─ Status: ${status}`);
        console.error("  └─ Run was cancelled");
        console.error(" [STEP 2] Polling complete - Cancelled");
        break;
      }

      if (status === "Failed") {
        console.error(`  ├─ Status: ${status}`);
        console.error("  ├─ Error:", runStatus?.data[0]?.error);
        console.error("  └─ Run failed");
        console.error(" [STEP 2] Polling complete - Failed");
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (pollCount >= maxPolls) {
      console.error("  └─ Timeout: Max polling time reached (60s)");
      console.error(" [STEP 2] Polling timeout");
    }

    console.log("\n [STEP 3] Extracting result...");
    const output = runStatus.data?.[0].output?.output[0];
    console.log("  ├─ Output type:", typeof output);
    console.log(
      "  ├─ Output keys:",
      output ? Object.keys(output).join(", ") : "none"
    );
    console.log("  └─ Output size:", JSON.stringify(output).length, "chars");
    console.log(" [STEP 3] Result extracted");

    console.log("\n" + "=".repeat(80));
    console.log(" [API /ai-offer-chat-agent] Request completed successfully");
    console.log("=".repeat(80));
    console.log(" Finished at:", new Date().toISOString());

    return NextResponse.json(output);
  } catch (error) {
    console.log("\n" + "=".repeat(80));
    console.error(" [API /ai-offer-chat-agent] Request failed");
    console.log("=".repeat(80));
    console.error(" Error type:", error?.constructor?.name || typeof error);
    console.error(" Error message:", (error as Error).message || error);
    console.error(" Error stack:");
    console.error((error as Error).stack);
    console.log("=".repeat(80));

    return NextResponse.json(
      { error: "Failed to process offer request", details: (error as Error).message },
      { status: 500 }
    );
  }
}

const getRuns = async (runId: string) => {
  try {
    const url =
      process.env.INNGEST_SERVER_HOST + "/v1/events/" + runId + "/runs";
    const result = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
      },
    });
    return result.data;
  } catch (error) {
    console.error("❌ getRuns error:", {
      runId,
      error: (error as Error).message
    });
    throw error;
  }
};
