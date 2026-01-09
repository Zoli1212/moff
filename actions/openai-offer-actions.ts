"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { enhancePromptWithRAG } from "@/actions/rag-context-actions";

// PriceList cache
let priceListCache: any[] | null = null;
let priceListCacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 perc

async function getPriceListForCategories(categories: string[]): Promise<any[]> {
  console.log(`🔄 PriceList betöltés (${categories.length} kategória)...`);

  try {
    const priceList = await prisma.priceList.findMany({
      where: {
        tenantEmail: "",
        category: { in: categories },
      },
      select: {
        category: true,
        task: true,
        unit: true,
        laborCost: true,
        materialCost: true,
      },
      orderBy: [{ category: "asc" }, { task: "asc" }],
    });

    console.log(`✅ PriceList betöltve: ${priceList.length} tétel`);
    return priceList;
  } catch (error) {
    console.error("❌ PriceList hiba:", error);
    return [];
  }
}

interface CreateOfferParams {
  userInput: string;
  existingItems?: any[];
}

export async function createOfferFromText({
  userInput,
  existingItems = [],
}: CreateOfferParams) {
  console.log("\n🚀 [createOfferFromText] STARTED");

  try {
    const { tenantEmail } = await getTenantSafeAuth();

    console.log("\n📝 [STEP 1] Building input...");
    const baseInput =
      existingItems.length > 0
        ? `${userInput}\n\nMeglévő tételek (ne vegyél fel ismétlődést):\n${JSON.stringify(existingItems, null, 2)}`
        : userInput;
    console.log("✅ [STEP 1] Input built");

    console.log("\n🔍 [STEP 2] RAG Context Enhancement...");
    let finalInput = baseInput;

    if (process.env.RAG_ENABLED === "true") {
      try {
        const ragEnhancedInput = await enhancePromptWithRAG(
          baseInput,
          userInput,
          true
        );
        finalInput = ragEnhancedInput;
        console.log("✅ [STEP 2] RAG enhancement successful");
      } catch (ragError) {
        console.error("⚠️ [STEP 2] RAG error:", ragError);
        finalInput = baseInput;
      }
    } else {
      console.log("⏭️  [STEP 2] RAG disabled, skipping");
    }

    console.log("\n🤖 [STEP 3] Calling OpenAI API (gpt-4o) - Initial pass...");

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    let retries = 2;
    let result: any = null;
    let lastError: any = null;

    while (retries > 0) {
      try {
        const attemptNum = 3 - retries;
        console.log(`\n  🔄 Attempt ${attemptNum}/2...`);

        const response = await fetch(
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
                  content: `Te egy felújítási ajánlatkészítő szakértő vagy. A felhasználó igényei alapján KÖTELEZŐEN egy teljes, részletes JSON formátumú ajánlatot készítesz.

**KRITIKUS SZABÁLYOK:**
1. MINDIG adj vissza TELJES ajánlatot, még ha hiányos az információ is
2. Ha valami nem tisztázott, adj vissza becslést ÉS add hozzá a "questions" részhez
3. SOHA ne add vissza: "További információ szükséges" - helyette MINDIG generálj ajánlatot a rendelkezésre álló adatok alapján
4. A "questions" rész KÖTELEZŐ, ha bármilyen információ hiányzik
5. Az árak (laborCost, materialCost) legyenek 0, mert később töltjük be őket
6. Az "offerSummary" KÖTELEZŐ - pontosan 4 mondat magyarul: 1) Mi szerepel az ajánlatban 2) Milyen munkafázisok 3) Mennyi időbe telik 4) Becsült költség

**VÁLASZ FORMÁTUM (szigorúan JSON):**
{
  "offer": {
    "title": "Rövid összefoglaló cím",
    "location": "Helyszín",
    "customerName": "Ügyfél neve (ha van)",
    "estimatedTime": "Becsült idő napokban",
    "offerSummary": "4 mondatos összefoglaló: 1) Mi szerepel az ajánlatban 2) Milyen munkafázisok 3) Mennyi időbe telik 4) Teljes költség",
    "items": [
      {
        "category": "Kategória (pl. Burkolás, Festés)",
        "task": "Feladat neve",
        "technology": "Technológia/módszer",
        "quantity": 0,
        "unit": "egység (m2, db, stb.)",
        "laborCost": 0,
        "materialCost": 0,
        "laborDays": 0,
        "notes": "Megjegyzés vagy egyedi tétel indoklás"
      }
    ],
    "questions": [
      "Tisztázandó kérdés 1?",
      "Tisztázandó kérdés 2?"
    ]
  }
}

Válaszolj CSAK érvényes JSON-nal, semmi mással!`,
                },
                { role: "user", content: finalInput },
              ],
              max_tokens: 4000,
              temperature: 0.1,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        result = data.choices?.[0]?.message?.content;

        console.log(
          "  ✅ Response received, length:",
          result?.length || 0,
          "chars"
        );
        break;
      } catch (error: any) {
        lastError = error;
        console.error("  ❌ Request failed:", error?.message);

        const is429 =
          error?.message?.includes("429") ||
          error?.message?.includes("rate limit");

        if (is429 && retries > 1) {
          console.log(`  ⚠️ Rate limit, waiting 120s...`);
          await new Promise((resolve) => setTimeout(resolve, 120 * 1000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    if (!result) {
      throw lastError || new Error("AI returned no result");
    }

    console.log("✅ [STEP 3] AI response received");

    console.log("\n📋 [STEP 4] Parsing AI Response...");
    let cleanedResult = result
      .trim()
      .replace(/^```json[\r\n]*/i, "")
      .replace(/^```[\r\n]*/i, "")
      .replace(/```$/, "")
      .trim();

    let parsedOffer;
    try {
      parsedOffer = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error("❌ JSON parse failed");
      throw new Error("Failed to parse AI response");
    }

    const offerData = parsedOffer.offer || parsedOffer;
    const items = offerData.items || [];
    const questions = offerData.questions || [];
    const offerSummary = offerData.offerSummary || null;

    console.log("✅ [STEP 4] JSON parsed successfully");
    console.log("  ├─ Items:", items.length);
    console.log("  ├─ Questions:", questions.length);
    console.log("  └─ Has offerSummary:", !!offerSummary);

    console.log("\n📚 [STEP 5] Loading prices for categories...");
    const categories = [
      ...new Set(
        offerData.items.map((item: any) => item.category).filter(Boolean)
      ),
    ] as string[];
    console.log("  ├─ Categories:", categories);

    const priceList = await getPriceListForCategories(categories);
    console.log("  └─ Loaded", priceList.length, "price items");

    console.log("\n💰 [STEP 6] Matching prices to items...");
    const itemsWithoutPrice: any[] = [];

    offerData.items.forEach((item: any) => {
      const match = priceList.find(
        (p) => p.category === item.category && p.task === item.task
      );
      if (match) {
        item.laborCost = match.laborCost;
        item.materialCost = match.materialCost;
        console.log(
          `  ├─ Matched: ${item.task} (${match.laborCost} + ${match.materialCost})`
        );
      } else {
        console.log(`  ⚠️ No match: ${item.task}`);
        itemsWithoutPrice.push(item);
      }
    });
    console.log("✅ [STEP 6] Price matching complete");

    // If there are items without prices, ask AI to estimate
    if (itemsWithoutPrice.length > 0) {
      console.log(
        `\n🤖 [STEP 6.5] AI price estimation for ${itemsWithoutPrice.length} items...`
      );

      try {
        const priceEstimationPrompt = `Adj meg 2025-ös reális budapesti felújítási árakat az alábbi tételekhez. Válaszolj CSAK JSON formátumban:

${JSON.stringify(
  itemsWithoutPrice.map((item) => ({
    category: item.category,
    task: item.task,
    technology: item.technology,
    unit: item.unit,
    quantity: item.quantity,
  })),
  null,
  2
)}

Válasz formátum:
{
  "prices": [
    {
      "task": "Feladat neve",
      "laborCost": 0,
      "materialCost": 0
    }
  ]
}`;

        const priceResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Te egy felújítási árbecslő szakértő vagy. Adj meg reális 2025-ös budapesti árakat.",
                },
                { role: "user", content: priceEstimationPrompt },
              ],
              max_tokens: 1000,
              temperature: 0.1,
            }),
          }
        );

        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          const priceResult = priceData.choices?.[0]?.message?.content;

          const cleanedPriceResult = priceResult
            .trim()
            .replace(/^```json[\r\n]*/i, "")
            .replace(/^```[\r\n]*/i, "")
            .replace(/```$/, "")
            .trim();

          const parsedPrices = JSON.parse(cleanedPriceResult);

          // Apply AI-estimated prices
          itemsWithoutPrice.forEach((item) => {
            const priceMatch = parsedPrices.prices?.find(
              (p: any) => p.task === item.task
            );
            if (priceMatch) {
              item.laborCost = priceMatch.laborCost;
              item.materialCost = priceMatch.materialCost;
              console.log(
                `  ├─ AI estimated: ${item.task} (${priceMatch.laborCost} + ${priceMatch.materialCost})`
              );
            }
          });

          console.log("✅ [STEP 6.5] AI price estimation complete");
        }
      } catch (error) {
        console.error("⚠️ [STEP 6.5] AI price estimation failed:", error);
        console.log("  └─ Continuing with 0 prices for unmatched items");
      }
    }

    console.log("\n💾 [STEP 7] Saving to database...");

    // Calculate totals
    let materialTotal = 0;
    let workTotal = 0;

    offerData.items.forEach((item: any) => {
      const qty = item.quantity || 0;
      materialTotal += (item.materialCost || 0) * qty;
      workTotal += (item.laborCost || 0) * qty;
    });

    const totalPrice = materialTotal + workTotal;

    const title = offerData.title || "Új ajánlat";
    const location = offerData.location || title;
    const customerName = offerData.customerName || "Új ügyfél";

    // Ensure estimatedTime is a string
    let estimatedTime = "1-2 nap";
    if (offerData.estimatedTime) {
      estimatedTime =
        typeof offerData.estimatedTime === "number"
          ? `${offerData.estimatedTime} nap`
          : String(offerData.estimatedTime);
    }

    // Transaction to save Work → Requirement → Offer
    const savedData = await prisma.$transaction(async (tx) => {
      // 1. Create MyWork
      console.log("  ├─ Creating MyWork...");
      const work = await tx.myWork.create({
        data: {
          title,
          customerName,
          date: new Date(),
          location,
          time: estimatedTime,
          totalPrice,
          tenantEmail,
        } as Prisma.MyWorkCreateInput,
      });

      console.log("  ├─ Work created:", work.id);

      // 2. Create Requirement
      console.log("  ├─ Creating Requirement for Work ID:", work.id);

      const requirement = await tx.requirement.create({
        data: {
          title: `Követelmény - ${title}`,
          description: userInput,
          myWorkId: work.id,
          versionNumber: 1,
          updateCount: 1,
          questionCount: questions.length || 0,
        },
      });

      console.log("  ├─ Requirement created:", requirement.id);

      // 3. Create Offer
      console.log("  ├─ Creating Offer for Requirement ID:", requirement.id);

      const formattedNotes =
        questions.length > 0
          ? "Tisztázandó kérdések:\n" +
            questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")
          : null;

      const offer = await tx.offer.create({
        data: {
          title,
          description: formattedNotes,
          totalPrice,
          materialTotal,
          workTotal,
          status: "draft",
          requirementId: requirement.id,
          items: offerData,
          recordId: uuidv4(),
          tenantEmail,
          offerSummary: offerSummary,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      console.log("  └─ Offer created:", offer.id);

      return { work, requirement, offer };
    });

    console.log("✅ [STEP 7] Database save successful");
    console.log("\n✅ [SUCCESS] Offer created");
    console.log("  ├─ Work ID:", savedData.work.id);
    console.log("  ├─ Requirement ID:", savedData.requirement.id);
    console.log("  └─ Offer ID:", savedData.offer.id);

    return {
      success: true,
      workId: savedData.work.id,
      requirementId: savedData.requirement.id,
      offerId: savedData.offer.id,
      offer: offerData,
    };
  } catch (error) {
    console.error("❌ [FATAL ERROR]:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
