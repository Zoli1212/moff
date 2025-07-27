import { NextRequest, NextResponse } from 'next/server';
import { ParsedWork, WorkItem } from "@/types/work";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location, offerDescription, estimatedDuration, offerItems } = body;


    
    if (!location || !offerDescription || !estimatedDuration || !offerItems) {
      return NextResponse.json({ error: 'Hiányzó mezők a kérésben.' }, { status: 400 });
    }

    // Create the OpenAI prompt
    const prompt = `A következő információk alapján hozz létre egy részletes munkafelosztást ÉRVÉNYES JSON formátumban, az alábbi szabályok szerint:

- Minden workItem pontosan tükrözze a hozzá tartozó offerItem mezőit: name, quantity, unit, unitPrice, materialUnitPrice, workTotal, materialTotal, totalPrice (EZEKET MÁSOLD ÁT az offerItem-ből VÁLTOZTATÁS NÉLKÜL!).
- Csak a következő mezőket generáld: requiredProfessionals (szakemberek listája), tools (szükséges eszközök), materials (szükséges anyagok).
- A fenti mezők (name, quantity, unit, unitPrice, materialUnitPrice, workTotal, materialTotal, totalPrice) értéke legyen azonos az offerItem megfelelő mezőjével, VÁLTOZTATÁS NÉLKÜL!
- NE írj magyarázatot, NE használj markdown-t, CSAK ÉRVÉNYES JSON-t adj vissza!

Helyszín: ${location}
Leírás: ${offerDescription}
Becsült időtartam: ${estimatedDuration}

Tételek (offerItems):
${JSON.stringify(offerItems, null, 2)}

A válasz JSON formátuma:
{
  "location": "helyszín",
  "description": "leírás",
  "estimatedDuration": "időtartam",
  "workItems": [
    {
      "name": "Tétel neve",
      "quantity": "mennyiség",
      "unit": "mértékegység",
      "unitPrice": "munka egységár",
      "materialUnitPrice": "anyag egységár",
      "workTotal": "munka összes ár",
      "materialTotal": "anyag összes ár",
      "totalPrice": "összes ár",
      "description": "rövid szakmai leírás (AI által generált)",
      "requiredProfessionals": [
        { "type": "szakember típusa", "quantity": 2 }
      ],
      "tools": "részletes eszközlista",
      "materials": "részletes anyaglista"
    }
  ]
}

Minden workItem a hozzá tartozó offerItem-ből jöjjön létre, a fenti szabályok betartásával! description-t mindig generálj!`;

    // Make the OpenAI API request
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Te egy profi magyar építési projektmenedzser vagy." },
          { role: "user", content: prompt },
        ],
        max_tokens: 10000, // LIMITÁLT, hogy ne legyen túl hosszú a válasz
        temperature: 0.2,
      }),
    });

    // Extract the response data
    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    // Log the OpenAI response
    console.log('--- OPENAI RAW RESPONSE ---');
    console.dir(data, { depth: null });
    console.log('--- OPENAI CONTENT FIELD ---');
    console.log(content);

     const cleaned = content.trim()
      .replace(/^```json[\r\n]*/i, '')
      .replace(/^```[\r\n]*/i, '')
      .replace(/```$/, '')
      .trim();

    let parsed: ParsedWork | null = null;

    try {
      parsed = JSON.parse(cleaned);
    } catch (jsonErr) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          return NextResponse.json({
            error: 'OpenAI válasz nem volt JSON (regex fallback sem sikerült).',
            rawContent: content,
            openaiRaw: data,
            details: innerErr instanceof Error ? innerErr.message : String(innerErr),
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          error: 'OpenAI válasz nem volt JSON (sem sima, sem regex fallback).',
          rawContent: content,
          openaiRaw: data,
          details: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        }, { status: 400 });
      }
    }

    // --- Szigorú validáció: minden workItem mező egyezzen az offerItem-mel ---
    if (parsed && Array.isArray(parsed.workItems) && Array.isArray(offerItems)) {
      for (let i = 0; i < offerItems.length; i++) {
        const offer = offerItems[i];
        const work = parsed.workItems[i];
        if (!work) {
          return NextResponse.json({
            error: `Hiányzó workItem a ${i}. offerItem-hez`,
            offerItem: offer,
          }, { status: 400 });
        }
        const fields: (keyof WorkItem)[] = ["name", "quantity", "unit", "unitPrice", "materialUnitPrice", "workTotal", "materialTotal", "totalPrice"];
for (const field of fields as (keyof WorkItem)[]) {
          if (String(work[field]) !== String(offer[field])) {
            return NextResponse.json({
              error: `workItem[${i}].${field} nem egyezik az offerItem-mel`,
              offerValue: offer[field],
              workValue: work[field],
              offerItem: offer,
              workItem: work,
            }, { status: 400 });
          }
        }
      }
    }
    // --- /Szigorú validáció ---
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[start-work] OpenAI hívás közbeni hiba:', err);
    return NextResponse.json({
      error: 'OpenAI válasz nem volt JSON.',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 400 });
  }
}
