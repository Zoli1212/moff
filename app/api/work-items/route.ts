import { NextRequest, NextResponse } from "next/server";
import { getWorkItemsWithWorkers } from "@/actions/work-actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json(
        { error: "workId parameter is required" },
        { status: 400 }
      );
    }

    const workItems = await getWorkItemsWithWorkers(Number(workId));

    return NextResponse.json({ workItems });
  } catch (error) {
    console.error("Error fetching work items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch work items",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
