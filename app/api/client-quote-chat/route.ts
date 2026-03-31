import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tavily } from "@tavily/core";
import { buildPriceContext, getAvailableCategories } from "@/lib/price-context";

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

/**
 * AI-based category recognition — asks GPT to match user text to available categories.
 * Returns matched category names from the database.
 */
async function recognizeCategories(
  userText: string,
  allCategories: string[]
): Promise<string[]> {
  if (!userText.trim() || !allCategories.length) return [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Hungarian construction industry classifier. Given a user's free-text description and a list of available work type categories, identify ALL relevant categories that match the user's needs.

AVAILABLE CATEGORIES:
${allCategories.map((c) => `- ${c}`).join("\n")}

RULES:
- Return ONLY category names from the list above, one per line
- Match broadly: "festés" should match painting-related categories, "villany" should match electrical categories
- Include related categories the user might need but didn't explicitly mention (e.g. "lakásfelújítás" implies multiple categories)
- If the text is too vague to determine any category, return "NONE"
- Do NOT invent categories — only use exact names from the list
- Return the Hungarian category names exactly as they appear in the list`,
        },
        {
          role: "user",
          content: userText,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = response.choices[0]?.message?.content || "";
    if (result.trim() === "NONE") return [];

    const matched = result
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => allCategories.includes(line));

    return matched;
  } catch {
    return [];
  }
}

/**
 * Extract structured project data from the full conversation after a quote is generated.
 * Single call per quote — not per message.
 */
async function extractProjectData(
  messages: { role: string; content: string }[]
): Promise<Record<string, unknown> | null> {
  try {
    const conversation = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a data extraction assistant. Extract structured project data from a Hungarian construction quote conversation.

Return ONLY valid JSON with these fields (use null for unknown/not mentioned):
{
  "location": "city or address string",
  "postalCode": "string or null",
  "propertyType": "apartment | house | office | commercial | other",
  "workTypes": ["array of identified work type strings"],
  "dimensions": {
    "totalArea": "number in m² or null",
    "rooms": "number or null",
    "ceilingHeight": "number in meters or null",
    "details": { "room/area name": "m² or fm or db" }
  },
  "materialProcurement": "client | contractor | mixed | null",
  "timeline": {
    "startDate": "string or null",
    "endDate": "string or null",
    "urgency": "normal | urgent | flexible"
  },
  "accessInfo": "string about logistics/access or null",
  "estimatedBudget": {
    "netTotal": "number in Ft or null",
    "grossTotal": "number in Ft or null",
    "breakdown": [{"workType": "string", "amount": "number in Ft"}]
  },
  "clientNotes": "any special requests or notes from the client"
}

RULES:
- Extract ONLY what was explicitly mentioned in the conversation
- Use null for anything not discussed
- Numbers should be actual numbers, not strings
- Keep workTypes in Hungarian as mentioned`,
        },
        {
          role: "user",
          content: conversation,
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonStr = text.includes("```json")
      ? text.split("```json")[1].split("```")[0]
      : text.includes("```")
      ? text.split("```")[1].split("```")[0]
      : text;

    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("[extractProjectData] Failed:", e);
    return null;
  }
}

function buildSystemPrompt(
  priceContext: string,
  internetPrices: string,
  matchedCategories?: string[],
  allCategories?: string[]
): string {
  const dbSection = priceContext
    ? `\nDATABASE PRICES (use these primarily for the quote):\n${priceContext}`
    : "";

  const webSection = internetPrices
    ? `\nINTERNET PRICE UPDATE (use these if no database data available):\n${internetPrices}\n`
    : "";

  const categorySection = allCategories?.length
    ? `\nAVAILABLE WORK TYPES IN DATABASE:\n${allCategories.map((c) => `- ${c}`).join("\n")}\n`
    : "";

  const matchedSection = matchedCategories?.length
    ? `\nRECOGNIZED WORK TYPES (matched from user's description):\n${matchedCategories.map((c) => `- ${c}`).join("\n")}\n`
    : "";

  return `You are an experienced Hungarian construction industry quote assistant on the Offerflow platform.
Your job is to collect all necessary information from the client for a quote, then provide an estimated price.
IMPORTANT: Always respond in Hungarian regardless of this system prompt being in English.
${categorySection}${matchedSection}${dbSection}${webSection}
WORK TYPE RECOGNITION:
- Identify relevant work types from the user's free text based on the available list above
- If multiple work types apply, handle all of them in parallel
- If ambiguous, ask a clarifying question: "Jól értem, hogy [work type 1] és [work type 2] munkákra gondol?"
- Use the database items (DATABASE PRICES) for pricing — these belong to the recognized work types
- If the user mentions work that doesn't match any category, use internet prices or general market knowledge

PROCESS:
1. Greet the user and understand the described project
2. Ask about missing critical data (max 2-3 questions at a time):
   - Location (city / postal code)
   - Property type (apartment, house, office, etc.)
   - Estimated dimensions (m², linear meters, pieces depending on work type)
   - Number of rooms (if relevant)
   - Material procurement (client / contractor / mixed)
   - Planned timeline (when needed)
3. When enough data collected, summarize what you understood ("Jól értem, hogy...?")
4. After confirmation, generate an ESTIMATED quote in the format below

ESTIMATED QUOTE FORMAT (only when you have: work type + location + dimensions):

---AJÁNLAT_KEZDET---
**Projekt összefoglaló:** [short description]
**Helyszín:** [location]
**Munkanemek és becsült árak:**
- [Work type 1]: [quantity] × [unit price] Ft = [total] Ft
- [Work type 2]: [quantity] × [unit price] Ft = [total] Ft
**Becsült nettó összeg:** [amount] Ft
**Becsült bruttó összeg (27% ÁFA):** [amount] Ft
*Ez egy tájékoztató jellegű becslés. A pontos ár helyszíni felmérés után határozható meg.*
---AJÁNLAT_VÉGE---

IMPORTANT RULES:
- Always respond in Hungarian
- Primarily use database prices (DATABASE PRICES section)
- If no relevant item in database, use internet data or general market prices
- Be friendly and helpful
- Do not generate a quote until you have: work type, location, dimensions`;
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

    // 1. Get available categories
    const allCategories = await getAvailableCategories();

    // 2. AI-based category recognition from user text
    const userText = messages
      .filter((m: { role: string }) => m.role === "user")
      .map((m: { content: string }) => m.content)
      .join(" ");

    const matchedCategories = await recognizeCategories(userText, allCategories);

    // 3. Load filtered price context + internet prices in parallel
    const [priceContext, internetPrices] = await Promise.all([
      buildPriceContext(matchedCategories.length > 0 ? matchedCategories : undefined),
      searchInternetPrices(messages),
    ]);

    const systemPrompt = buildSystemPrompt(
      priceContext,
      internetPrices,
      matchedCategories.length > 0 ? matchedCategories : undefined,
      allCategories
    );

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

    // Extract structured project data when a quote is generated
    let metaDataUpdate = {};
    if (reply.includes("---AJÁNLAT_KEZDET---")) {
      const projectData = await extractProjectData(updatedMessages);
      if (projectData) {
        metaDataUpdate = { metaData: JSON.parse(JSON.stringify(projectData)) };
      }
    }

    await prisma.history.updateMany({
      where: {
        recordId: sessionId,
        userEmail: email,
        aiAgentType: "client-quote",
      },
      data: {
        content: updatedMessages,
        ...metaDataUpdate,
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
