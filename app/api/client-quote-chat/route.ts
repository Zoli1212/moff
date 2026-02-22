import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tavily } from "@tavily/core";
import { buildPriceContext } from "@/lib/price-context";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function searchInternetPrices(
  messages: { role: string; content: string }[]
): Promise<string> {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => m.content)
    .join(" ");

  if (!userTexts.trim()) return "";

  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const query = `${userTexts.substring(0, 150)} építőipari munkadíj ár Magyarország ${new Date().getFullYear()}`;
    const results = await tvly.search(query, {
      searchDepth: "basic",
      maxResults: 3,
    });

    if (!results.results?.length) return "";

    return results.results
      .map((r) => `- ${r.title}: ${(r.content ?? "").substring(0, 200)}`)
      .join("\n");
  } catch {
    return "";
  }
}

function buildSystemPrompt(priceContext: string, internetPrices: string): string {
  const dbSection = priceContext
    ? `\nADATBÁZIS ÁRAK (elsősorban ezeket használd az ajánlathoz):\n${priceContext}`
    : "";

  const webSection = internetPrices
    ? `\nINTERNETES ÁRFRISSÍTÉS (ha az adatbázisban nincs adat, ezekre támaszkodj):\n${internetPrices}\n`
    : "";

  return `Te egy tapasztalt magyar építőipari ajánlatkérő asszisztens vagy az Offerflow platformon.
Feladatod, hogy a megrendelőtől összegyűjtsd az ajánlathoz szükséges összes fontos információt, majd egy hozzávetőleges árbecslést adj.
${dbSection}${webSection}
FOLYAMAT:
1. Üdvözöld a felhasználót és értsd meg a leírt projektet
2. Kérdezz rá a hiányzó kritikus adatokra (egyszerre max 2-3 kérdés):
   - Helyszín (település / irányítószám)
   - Ingatlan típusa (lakás, ház, iroda, stb.)
   - Becsült területek / méretek (m², fm, db a munkanemtől függően)
   - Helyiségek száma (ha releváns)
   - Anyagbeszerzés (megrendelő / kivitelező / vegyes)
   - Tervezett időzítés (mikor kell)
3. Ha elég adat gyűlt össze, foglald össze amit értettél ("Jól értem, hogy...?")
4. Megerősítés után generálj BECSÜLT ajánlatot az alábbi formátumban

BECSÜLT AJÁNLAT FORMÁTUM (csak ha már van: munkanem + helyszín + méretek):

---AJÁNLAT_KEZDET---
**Projekt összefoglaló:** [rövid leírás]
**Helyszín:** [helyszín]
**Munkanemek és becsült árak:**
- [Munkanem 1]: [mennyiség] × [egységár] Ft = [összeg] Ft
- [Munkanem 2]: [mennyiség] × [egységár] Ft = [összeg] Ft
**Becsült nettó összeg:** [összeg] Ft
**Becsült bruttó összeg (27% ÁFA):** [összeg] Ft
*Ez egy tájékoztató jellegű becslés. A pontos ár helyszíni felmérés után határozható meg.*
---AJÁNLAT_VÉGE---

FONTOS SZABÁLYOK:
- Mindig magyarul válaszolj
- Elsősorban az adatbázisban szereplő árakat használd (ADATBÁZIS ÁRAK szekció)
- Ha az adatbázisban nincs releváns tétel, az internetes adatokat vagy általános piaci árat adj meg
- Légy barátságos és segítőkész
- Ne generálj ajánlatot, amíg nincs meg: munkanem, helyszín, méretek`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const { messages, sessionId } = await req.json();

    if (!messages || !sessionId) {
      return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
    }

    const session = await prisma.history.findFirst({
      where: {
        recordId: sessionId,
        userEmail: email,
        aiAgentType: "client-quote",
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session nem található" },
        { status: 404 }
      );
    }

    // Load price context and internet prices in parallel
    const [priceContext, internetPrices] = await Promise.all([
      buildPriceContext(),
      searchInternetPrices(messages),
    ]);

    const systemPrompt = buildSystemPrompt(priceContext, internetPrices);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply =
      completion.choices[0]?.message?.content ?? "Nem tudok válaszolni.";

    // Save updated chat log to History (session continuity, NOT an Offer record)
    const updatedMessages = [
      ...messages,
      { role: "assistant", content: reply },
    ];

    await prisma.history.updateMany({
      where: {
        recordId: sessionId,
        userEmail: email,
        aiAgentType: "client-quote",
      },
      data: {
        content: updatedMessages,
      },
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[client-quote-chat] Error:", error);
    return NextResponse.json(
      { error: "Hiba történt.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
