import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@clerk/nextjs/server";
import { getAssistantContextWithRAG } from "@/actions/assistant-context-actions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Login required" },
        { status: 401 }
      );
    }

    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Üzenet kötelező!" },
        { status: 400 }
      );
    }

    // RAG-enhanced kontextus betöltése
    const ragContext = await getAssistantContextWithRAG(message);
    
    // Kontextus előkészítése
    const systemMessage = `Te egy építőipari asszisztens vagy, aki segít a felhasználónak a munkáiról és ajánlatairól.

A felhasználó munkái és ajánlatai:
${ragContext.fullContext || "Nincs elérhető adat."}

Válaszolj röviden, tömören és segítőkészen magyarul. Ha a felhasználó kérdez valamit a munkáiról vagy ajánlatairól, használd a fenti kontextust.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "Nem tudok válaszolni.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[assistant-chat] Error:", error);
    return NextResponse.json(
      { error: "Hiba történt a válasz generálása során.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
