import { NextRequest, NextResponse } from "next/server";
import { ParsedWork, WorkItem } from "@/types/work";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location, offerDescription, estimatedDuration, offerItems } = body;

    if (!location || !offerDescription || !estimatedDuration || !offerItems) {
      return NextResponse.json(
        { error: "Hiányzó mezők a kérésben." },
        { status: 400 }
      );
    }

    // Create the OpenAI prompt
    const prompt = `A következő információk alapján hozz létre egy részletes munkafelosztást ÉRVÉNYES JSON formátumban, az alábbi SZIGORÚ szabályokkal:

    Általános elv:
    - Minden workItem KÖTELEZŐEN tartalmazza: description (1–3 mondat), requiredProfessionals (>=1), tools (nem üres string), materials (>=1).
    - TILOS üres stringet, üres tömböt, "N/A", "-", "none" stb. helykitöltőt használni.
    - Minden szám mező pozitív; minden "type" és "unit" nem üres string.
    - Ha bármelyik kötelező mező üres lenne, NE add vissza a választ – addig állítsd össze, míg MIND megfelel.
    
    OfferItem átvétel:
    - A következő mezőket VÁLTOZTATÁS NÉLKÜL MÁSOLD át az offerItem-ből a workItem-be:
      name, quantity, unit, unitPrice, materialUnitPrice, workTotal, materialTotal, totalPrice
    
    Csak az alábbi mezőket generáld:
    - description: rövid szakmai leírás (1–3 mondat)
    - requiredProfessionals: objektumok tömbje, MIND: { "type": string!=üres, "quantity": number>0 }
    - A requiredProfessionals mező egy objektumokból álló tömb, amelynek minden eleme KÉT KULCSOT tartalmaz: "type" és "quantity".
    - A "type" mezőbe KIZÁRÓLAG az alábbi lista szakmáit használd: 'Kőműves', 'Burkoló', 'Villanyszerelő', 'Víz- és gázszerelő', 'Festő-mázoló', 'Ács', 'Asztalos', 'Gipszkartonozó', 'Földmunkagép-kezelő', 'Építésvezető', 'Építőmérnök', 'Statikus', 'Hegesztő', 'Bádogos', 'Tetőfedő', 'Szigetelő szakember', 'Kertépítő', 'Díszburkoló', 'Lakatos', 'Homlokzati szakember', 'Belsőépítész', 'Gépszerelő', 'Darukezelő', 'Kőfaragó', 'Szobafestő', 'Takarító', 'Segédmunkás', 'Tartószerkezet-tervező mérnök', 'Épületgépész mérnök', 'Villamosmérnök'. TILOS bármilyen más, a listán nem szereplő szakmát megadni.
    - tools: részletes eszközlista szövegként (nem üres)
    - materials: objektumok tömbje, MIND: { "type": string!=üres, "quantity": number>0, "unit": string!=üres }
    
    Kimeneti formátum:
    - CSAK ÉRVÉNYES JSON, semmi magyarázat, semmi markdown.
    
    Bemenet:
    Helyszín: ${location}
    Leírás: ${offerDescription}
    Becsült időtartam: ${estimatedDuration}
    
    Tételek (offerItems):
    ${JSON.stringify(offerItems, null, 2)}
    
    Válasz JSON váz:
    {
      "location": "helyszín",
      "description": "leírás",
      "estimatedDuration": "időtartam",
      "workItems": [
        {
          "name": "Tétel neve",
          "quantity": <number | string>,
          "unit": "mértékegység",
          "unitPrice": <number | string>,
          "materialUnitPrice": <number | string>,
          "workTotal": <number | string>,
          "materialTotal": <number | string>,
          "totalPrice": <number | string>,
          "description": "rövid szakmai leírás",
          "requiredProfessionals": [
            { "type": "szakember típusa", "quantity": <number> }
          ],
          "tools": "részletes eszközlista",
          "materials": [
            { "type": "anyag típusa", "quantity": <number>, "unit": "mértékegység" }
          ]
        }
      ]
    }
    
    Megjegyzés:
    - MINDEN workItem-hez legalább 1 szakember és legalább 1 anyag kötelező. A tools NEM lehet üres.
    - A fenti átvett mezők értékeinek pontosan egyezniük kell az offerItem megfelelő értékeivel.
    - NE írj magyarázatot, NE használj markdown-t, CSAK ÉRVÉNYES JSON-t adj vissza!
    - Minden workItem a hozzá tartozó offerItem-ből jöjjön létre, a fenti szabályok betartásával! description-t mindig generálj!`;

    // Make the OpenAI API request
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Te egy profi magyar építési projektmenedzser vagy.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 10000, // LIMITÁLT, hogy ne legyen túl hosszú a válasz
          temperature: 0.2,
        }),
      }
    );

    // Extract the response data
    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Log the OpenAI response
    console.log("--- OPENAI RAW RESPONSE ---");
    console.dir(data, { depth: null });
    console.log("--- OPENAI CONTENT FIELD ---");
    console.log(content);

    const cleaned = content
      .trim()
      .replace(/^```json[\r\n]*/i, "")
      .replace(/^```[\r\n]*/i, "")
      .replace(/```$/, "")
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
          return NextResponse.json(
            {
              error:
                "OpenAI válasz nem volt JSON (regex fallback sem sikerült).",
              rawContent: content,
              openaiRaw: data,
              details:
                innerErr instanceof Error ? innerErr.message : String(innerErr),
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error:
              "OpenAI válasz nem volt JSON (sem sima, sem regex fallback).",
            rawContent: content,
            openaiRaw: data,
            details:
              jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
          },
          { status: 400 }
        );
      }
    }

    // --- Szigorú validáció: minden workItem mező egyezzen az offerItem-mel ---
    if (
      parsed &&
      Array.isArray(parsed.workItems) &&
      Array.isArray(offerItems)
    ) {
      for (let i = 0; i < offerItems.length; i++) {
        const offer = offerItems[i];
        const work = parsed.workItems[i];
        if (!work) {
          return NextResponse.json(
            {
              error: `Hiányzó workItem a ${i}. offerItem-hez`,
              offerItem: offer,
            },
            { status: 400 }
          );
        }
        const fields: (keyof WorkItem)[] = [
          "name",
          "quantity",
          "unit",
          "unitPrice",
          "materialUnitPrice",
          "workTotal",
          "materialTotal",
          "totalPrice",
        ];
        for (const field of fields as (keyof WorkItem)[]) {
          if (String(work[field]) !== String(offer[field])) {
            return NextResponse.json(
              {
                error: `workItem[${i}].${field} nem egyezik az offerItem-mel`,
                offerValue: offer[field],
                workValue: work[field],
                offerItem: offer,
                workItem: work,
              },
              { status: 400 }
            );
          }
        }
      }
    }
    // --- /Szigorú validáció ---
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[start-work] OpenAI hívás közbeni hiba:", err);
    return NextResponse.json(
      {
        error: "OpenAI válasz nem volt JSON.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }
}
