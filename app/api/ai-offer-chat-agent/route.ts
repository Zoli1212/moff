import { inngest } from "@/inngest/client";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    const resultIds = await inngest.send({
      name: "AiOfferAgent",
      data: {
        userInput: userInput,
      },
    });

    const runId = resultIds?.ids[0];
    let runStatus;
    let pollCount = 0;
    const maxPolls = 120;

    while (pollCount < maxPolls) {
      pollCount++;
      runStatus = await getRuns(runId);

      const status = runStatus?.data[0]?.status;

      if (status === "Completed") {
        break;
      }

      if (status === "Cancelled") {
        break;
      }

      if (status === "Failed") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const output = runStatus.data?.[0].output?.output[0];

    return NextResponse.json(output);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process offer request",
        details: (error as Error).message,
      },
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
    throw error;
  }
};
