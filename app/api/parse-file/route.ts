import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log("[parse-file] Request received");
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("[parse-file] No file in request");
      return NextResponse.json(
        { error: "Nincs fájl feltöltve" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    console.log("[parse-file] Processing file:", fileName, "Size:", file.size);

    let extractedText = "";

    // Excel fájl feldolgozás
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      console.log("[parse-file] Processing Excel file");
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetNames = workbook.SheetNames;
        console.log("[parse-file] Found sheets:", sheetNames);

        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          extractedText += `\n=== ${sheetName} ===\n`;
          extractedText += sheetData
            .map((row: any) => (row as any[]).join(" | "))
            .join("\n");
        }
        console.log(
          "[parse-file] Excel extraction complete, length:",
          extractedText.length
        );
      } catch (error) {
        console.error("[parse-file] Excel parsing error:", error);
        return NextResponse.json(
          { error: "Hiba az Excel fájl feldolgozása során" },
          { status: 500 }
        );
      }
    }
    // PDF fájl feldolgozás WebPDFLoader használatával
    else if (fileName.endsWith(".pdf")) {
      console.log("[parse-file] Processing PDF file");
      try {
        const loader = new WebPDFLoader(file);
        const docs = await loader.load();
        extractedText = docs.map((doc) => doc.pageContent).join("\n\n");
        console.log(
          "[parse-file] PDF extraction complete, length:",
          extractedText.length
        );
      } catch (error) {
        console.error("[parse-file] PDF parsing error:", error);
        return NextResponse.json(
          { error: "Hiba a PDF fájl feldolgozása során" },
          { status: 500 }
        );
      }
    } else {
      console.log("[parse-file] Unsupported file format");
      return NextResponse.json(
        {
          error:
            "Nem támogatott fájlformátum. Csak Excel (.xlsx, .xls) és PDF fájlokat fogadunk el.",
        },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "A fájl üres vagy nem tartalmaz feldolgozható szöveget" },
        { status: 400 }
      );
    }

    // AI feldolgozás - strukturált ajánlatkérés generálása
    let structuredText = extractedText;

    try {
      const aiPrompt = `A következő szöveg egy ajánlatkérés fájlból kinyert tartalma. 
Kérlek alakítsd át strukturált, részletes ajánlatkérés szöveggé, amely tartalmazza:
- A projekt pontos leírását
- A helyszín információkat (ha van)
- A szükséges munkák részletes listáját
- Mennyiségeket és mértékegységeket (ha van)
- Határidő információkat (ha van)
- Bármilyen egyéb releváns információt

A kimenet legyen természetes magyar nyelvű szöveg, amit egy építési vállalkozó könnyen megérthet.

Eredeti szöveg:
${extractedText}

Strukturált ajánlatkérés:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Te egy építőipari szakértő vagy, aki segít strukturálni az ajánlatkéréseket.",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      structuredText = completion.choices[0]?.message?.content || extractedText;
    } catch (aiError) {
      console.error("OpenAI processing error:", aiError);
      // Ha az AI feldolgozás sikertelen, használjuk az eredeti szöveget
      structuredText = extractedText;
    }

    return NextResponse.json({
      success: true,
      extractedText: structuredText,
      originalText: extractedText,
    });
  } catch (error: any) {
    console.error("[parse-file] Main error:", error);
    console.error("[parse-file] Error message:", error?.message);
    console.error("[parse-file] Error stack:", error?.stack);
    return NextResponse.json(
      {
        error: "Hiba történt a fájl feldolgozása során. Kérjük próbáld újra.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
