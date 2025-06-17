import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const user = await currentUser();

    console.log(user, "user");
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    const recordId = (await params).recordId;

    if (!userEmail) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!recordId) {
      return new NextResponse(
        JSON.stringify({ error: "Record ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const record = await prisma.history.findFirst({
      where: {
        recordId: recordId,
        aiAgentType: "ai-offer-letter",
        tenantEmail: userEmail,
      },
    });

    console.log(record, "record");
    if (!record) {
      return new NextResponse(JSON.stringify({ error: "Offer not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

 
    interface OutputItem {
      role: string;
      type: string;
      content: string;
    }
    
    interface ParsedContent {
      output?: OutputItem[];
      [key: string]: unknown;
    }
    
    let parsedContent: ParsedContent;
    
    if (typeof record.content === "string") {
      try {
        parsedContent = JSON.parse(record.content) as ParsedContent;
      } catch {
        console.error("Error parsing content");
        parsedContent = { output: [] };
      }
    } else if (typeof record.content === "object" && record.content !== null) {
      parsedContent = record.content as ParsedContent;
    } else {
      parsedContent = { output: [] };
    }
    
    // ✅ Biztonságos output lekérés
    let output: OutputItem[] = [];
    
    if ('output' in parsedContent && Array.isArray(parsedContent.output)) {
      output = parsedContent.output;
    }
    
    console.log(output, "output");
    // Prepare the response data
    const responseData = {
      id: record.id,
      recordId: record.recordId,
      content: parsedContent,
      output: output,
      metaData:
        record.metaData && typeof record.metaData === "object"
          ? record.metaData
          : {},
      createdAt: record.createdAt || new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
