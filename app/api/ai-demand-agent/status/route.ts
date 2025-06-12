// app/api/ai-demand-agent/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  try {
    const result = await axios.get(`${process.env.INNGEST_SERVER_HOST}/v1/events/${eventId}/runs`, {
      headers: {
        Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
      }
    });

    const run = result.data?.data?.[0];
    const status = run?.status || "Unknown";

    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check run status" }, { status: 500 });
  }
}
