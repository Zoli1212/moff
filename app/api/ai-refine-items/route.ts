import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@clerk/nextjs/server";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Login required" },
        { status: 401 }
      );
    }

    const { items, userRefinement } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    if (!userRefinement || typeof userRefinement !== "string") {
      return NextResponse.json(
        { error: "User refinement text is required" },
        { status: 400 }
      );
    }

    // Build the prompt for GPT
    const systemPrompt = `Te egy építőipari árajánlat-készítő AI asszisztens vagy. A felhasználó egy meglévő árajánlat tételeit szeretné pontosítani.

FELADATOD:
1. Elemezd a felhasználó kérését és azonosítsd, mely tételekre vonatkozik a módosítás
2. A módosítás által ÉRINTETT tételeket frissítsd a kérésnek megfelelően
3. A módosítás által NEM ÉRINTETT tételeket PONTOSAN UGYANÚGY tartsd meg, változatlanul
4. Ha új tételt kell hozzáadni, add hozzá a meglévő tételekhez
5. Ha tételt kell törölni, hagyd ki a válaszból
6. Tartsd be a következő formátumot minden tételnél:
   - name: tétel neve (string)
   - quantity: mennyiség (string, csak szám)
   - unit: mértékegység (string, pl. "db", "m2", "m3", "fm")
   - materialUnitPrice: anyag egységár (string, "XXXX Ft" formátumban)
   - unitPrice: munka egységár (string, "XXXX Ft" formátumban)
   - materialTotal: anyag összesen (string, "XXXX Ft" formátumban)
   - workTotal: munka összesen (string, "XXXX Ft" formátumban)
   - id: meglévő tételeknél tartsd meg az eredeti id-t, új tételeknél generálj új UUID-t (például "item-" + Date.now() + "-" + random)

FONTOS SZABÁLYOK:
- A materialTotal = quantity * materialUnitPrice értékben
- A workTotal = quantity * unitPrice értékben
- Az árak MINDIG "XXXX Ft" formátumban legyenek (pl. "15000 Ft", "2500 Ft")
- Egész számokat használj az árakban, tizedesjegyek nélkül
- Ha egy tételt NEM említ a felhasználó, akkor azt PONTOSAN UGYANÚGY add vissza
- Csak a megváltozott tételeket módosítsd
- Ha a felhasználó új tételt kér, adj hozzá új UUID-val
- Ha a felhasználó tételt törölni kér, hagyd ki azt a válaszból

Válaszolj CSAK és KIZÁRÓLAG egy JSON objektummal, ami egy "items" kulcsot tartalmaz, benne a tételek tömbje. Semmi más szöveg, magyarázat vagy markdown ne legyen a válaszban!

Válasz formátum:
{
  "items": [
    {
      "id": "uuid vagy meglévő id",
      "name": "Tétel neve",
      "quantity": "1",
      "unit": "db",
      "materialUnitPrice": "0 Ft",
      "unitPrice": "15000 Ft",
      "materialTotal": "0 Ft",
      "workTotal": "15000 Ft"
    }
  ]
}`;

    const userPrompt = `JELENLEGI TÉTELEK:
${JSON.stringify(items, null, 2)}

FELHASZNÁLÓ PONTOSÍTÁSI KÉRÉSE:
${userRefinement}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Parse the JSON response
    let refinedData;
    try {
      refinedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse GPT response:", parseError);
      console.error("Raw response:", responseText);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: responseText,
        },
        { status: 500 }
      );
    }

    if (!refinedData.items || !Array.isArray(refinedData.items)) {
      return NextResponse.json(
        {
          error: "Invalid response format from AI",
          details: refinedData,
        },
        { status: 500 }
      );
    }

    // Calculate totals
    let materialTotal = 0;
    let workTotal = 0;

    for (const item of refinedData.items) {
      const matTotal = parseInt(item.materialTotal.replace(/[^\d]/g, "")) || 0;
      const wrkTotal = parseInt(item.workTotal.replace(/[^\d]/g, "")) || 0;
      materialTotal += matTotal;
      workTotal += wrkTotal;
    }

    const totalCost = materialTotal + workTotal;

    return NextResponse.json({
      success: true,
      items: refinedData.items,
      totals: {
        materialTotal,
        workTotal,
        totalCost,
      },
    });
  } catch (error) {
    console.error("❌ AI refine items error:", error);
    return NextResponse.json(
      {
        error: "Failed to refine items",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
