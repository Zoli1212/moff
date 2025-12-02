import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
// import { Readable } from 'stream';

// async function bufferToStream(buffer: Buffer): Promise<Readable> {
//   const stream = new Readable();
//   stream.push(buffer);
//   stream.push(null);
//   return stream;
// }

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromExcel(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  console.log(fileType);

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    text += XLSX.utils.sheet_to_csv(worksheet) + "\n\n";
  });

  return text;
}

async function extractTextFromCsv(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const loader = new WebPDFLoader(file);
    const docs = await loader.load();
    return docs.map((doc) => doc.pageContent).join("\n---\n");
  } else if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromDocx(buffer);
  } else if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  ) {
    return await extractTextFromExcel(buffer, file.type);
  } else if (file.type === "text/csv") {
    return await extractTextFromCsv(buffer);
  } else {
    throw new Error("Unsupported file type");
  }
}

export async function POST(req: NextRequest) {
  console.log("\n" + "=".repeat(80));
  console.log(" [API /ai-demand-agent] Request received");
  console.log("=".repeat(80));
  console.log(" Timestamp:", new Date().toISOString());

  try {
    console.log("\n [STEP 1] Parsing form data...");
    const formData = await req.formData();
    const demandFile = formData.get("demandFile") as File | null;
    const recordId = formData.get("recordId")?.toString();
    const textContent = formData.get("textContent")?.toString();
    const type = formData.get("type")?.toString() || "demand-analyzer";

    console.log("  ├─ recordId:", recordId);
    console.log("  ├─ type:", type);
    console.log("  ├─ has demandFile:", !!demandFile);
    console.log("  ├─ has textContent:", !!textContent);
    console.log("  └─ textContent length:", textContent?.length || 0, "chars");

    // Kezeljük a meglévő tételeket, ha vannak
    let existingItems = [];
    try {
      const existingItemsStr = formData.get("existingItems")?.toString();
      if (existingItemsStr) {
        existingItems = JSON.parse(existingItemsStr);
        if (!Array.isArray(existingItems)) {
          existingItems = [];
        }
      }
    } catch (error) {
      console.error("  ├─ ⚠️ Hibás existingItems formátum:", error);
      existingItems = [];
    }
    console.log("  └─ existingItems count:", existingItems.length);
    console.log(" [STEP 1] Form data parsed");

    if (!recordId) {
      console.error(" Missing recordId");
      return NextResponse.json({ error: "Hiányzó recordId" }, { status: 400 });
    }

    console.log("\n [STEP 2] Getting current user...");
    const user = await currentUser();
    console.log("  ├─ User email:", user?.emailAddresses?.[0]?.emailAddress);
    console.log("  └─ User ID:", user?.id);
    console.log(" [STEP 2] User retrieved");

    console.log("\n [STEP 3] Processing content...");
    let content = "";
    let base64File = "";
    let fileType = "";
    let fileName = "";

    if (demandFile instanceof File) {
      console.log("  ├─ Processing file:", demandFile.name);
      console.log("  ├─ File type:", demandFile.type);
      console.log("  ├─ File size:", demandFile.size, "bytes");
      content = await extractTextFromFile(demandFile);
      console.log("  ├─ Extracted text length:", content.length, "chars");
      const arrayBuffer = await demandFile.arrayBuffer();
      base64File = Buffer.from(arrayBuffer).toString("base64");
      console.log("  ├─ Base64 length:", base64File.length, "chars");
      fileType = demandFile.type;
      fileName = demandFile.name;
    } else if (textContent) {
      console.log("  ├─ Processing text input");
      content = textContent;
      fileType = "text/plain";
      fileName = "text-input.txt";
      console.log("  └─ Content length:", content.length, "chars");
    } else {
      console.error(" No input data provided");
      return NextResponse.json(
        { error: "Hiányzó bemeneti adat" },
        { status: 400 }
      );
    }
    console.log(" [STEP 3] Content processed");

    console.log("\n [STEP 4] Preparing Inngest event...");
    const aiAgentType =
      type === "offer-letter"
        ? "/ai-tools/ai-offer-letter"
        : "/ai-tools/ai-demand-analyzer";

    const isOfferLetter = type === "offer-letter";
    console.log("  ├─ isOfferLetter:", isOfferLetter);
    console.log("  ├─ aiAgentType:", aiAgentType);

    const eventData = isOfferLetter
      ? {
          userInput: content,
          recordId,
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          existingItems: existingItems,
        }
      : {
          recordId,
          base64DemandFile: base64File,
          fileText: content,
          fileType,
          fileName,
          aiAgentType,
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          inputType: demandFile ? "file" : "text",
        };

    console.log(
      "  ├─ Event name:",
      isOfferLetter ? "AiOfferAgent" : "AiDemandAgent"
    );
    console.log("  ├─ Event data keys:", Object.keys(eventData).join(", "));
    console.log(
      "  └─ Event data size:",
      JSON.stringify(eventData).length,
      "chars"
    );
    console.log(" [STEP 4] Event data prepared");

    console.log("\n [STEP 5] Sending event to Inngest...");
    const result = await inngest.send({
      name: isOfferLetter ? "AiOfferAgent" : "AiDemandAgent",
      data: eventData,
    });

    const eventId = result.ids?.[0];
    console.log("  ├─ Event sent successfully");
    console.log("  └─ Event ID:", eventId);
    console.log(" [STEP 5] Inngest event triggered");

    console.log("\n" + "=".repeat(80));
    console.log(" [API /ai-demand-agent] Request completed successfully");
    console.log("=".repeat(80));
    console.log(" Timestamp:", new Date().toISOString());
    console.log(" Returning:", { status: "queued", eventId });

    return NextResponse.json({ status: "queued", eventId });
  } catch (error) {
    console.log("\n" + "=".repeat(80));
    console.error(" [API /ai-demand-agent] Request failed");
    console.log("=".repeat(80));
    console.error(
      " Error type:",
      (error as Error)?.constructor?.name || typeof error
    );
    console.error(" Error message:", (error as Error)?.message || error);
    console.error(" Error stack:");
    console.error((error as Error)?.stack);
    console.log("=".repeat(80));

    return NextResponse.json(
      { error: "Hiba történt a fájl feldolgozása során" },
      { status: 500 }
    );
  }
}
//         headers: {
//             Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
//         }
//     })

//     return result.data
// }
