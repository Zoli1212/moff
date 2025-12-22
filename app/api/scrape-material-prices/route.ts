import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tavily } from "@tavily/core";

export async function POST(req: NextRequest) {
  console.log("\n🚀 [scrape-material-prices] API endpoint called");
  try {
    // ✅ SECURITY: Check authentication
    const user = await currentUser();
    if (!user) {
      console.log("❌ [scrape-material-prices] Unauthorized - no user");
      return NextResponse.json(
        { error: "Unauthorized - Login required" },
        { status: 401 }
      );
    }
    console.log(
      "✅ [scrape-material-prices] User authenticated:",
      user.emailAddresses[0]?.emailAddress
    );

    const body = await req.json();
    const { workItemId, forceRefresh, materialName } = body;

    // Get the workItem
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        materialUnitPrice: true,
        currentMarketPrice: true,
        lastPriceCheck: true,
        work: {
          select: {
            id: true,
            status: true,
            tenantEmail: true,
          },
        },
      },
    });

    if (!workItem) {
      return NextResponse.json(
        { error: "WorkItem nem található" },
        { status: 404 }
      );
    }

    // Check if price check is needed (only if 3 days passed or forceRefresh)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (
      !forceRefresh &&
      workItem.lastPriceCheck &&
      workItem.lastPriceCheck > threeDaysAgo
    ) {
      console.log(
        "ℹ️ [scrape-material-prices] Price was checked recently, skipping"
      );
      return NextResponse.json({
        message: "Az árak frissek, nincs szükség új lekérdezésre",
        currentMarketPrice: workItem.currentMarketPrice,
      });
    }

    // Use Tavily for real web scraping
    console.log("🔍 [scrape-material-prices] Using Tavily for web search...");

    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

    // Build search query for Hungarian construction material webshops
    // Use materialName if provided, otherwise fall back to workItem.name
    const searchTerm = materialName || workItem.name;
    const searchQuery = `${searchTerm} ${workItem.unit} ár`;

    console.log("🔎 [scrape-material-prices] Search query:", searchQuery);
    if (materialName) {
      console.log("📦 [scrape-material-prices] Using material name:", materialName);
    }

    let searchResults;
    try {
      searchResults = await tvly.search(searchQuery, {
        searchDepth: "advanced",
        maxResults: 15,
        includeDomains: [
          "obi.hu",
          "praktiker.hu",
          "bauhaus.hu",
          "leroymerlin.hu",
          "epitkereso.hu",
          "baumax.hu",
          "emag.hu",
          "extreme-digital.hu",
          "aquacity.hu",
          "furdoszobashop.hu",
          "burkolat-market.hu"
        ],
      });

      console.log("✅ [scrape-material-prices] Tavily search completed");
      console.log(`📊 [scrape-material-prices] Found ${searchResults.results?.length || 0} results`);

      // Log all found results with title, URL, and content
      if (searchResults.results && searchResults.results.length > 0) {
        console.log("\n🔍 [scrape-material-prices] TALÁLATOK:");
        searchResults.results.forEach((result: any, index: number) => {
          console.log(`\n  ${index + 1}. ${result.title || 'Nincs cím'}`);
          console.log(`     URL: ${result.url || 'Nincs URL'}`);
          if (result.content) {
            console.log(`     Content: ${result.content.substring(0, 200)}...`);
          }
        });
        console.log("\n");
      }
    } catch (tavilyError) {
      console.error("❌ [scrape-material-prices] Tavily error:", tavilyError);
      return NextResponse.json(
        {
          error: "Hiba történt a web scraping során",
          details: tavilyError instanceof Error ? tavilyError.message : String(tavilyError),
        },
        { status: 500 }
      );
    }

    // If no results found, return "not available"
    if (!searchResults.results || searchResults.results.length === 0) {
      console.log("ℹ️ [scrape-material-prices] No results found");
      const priceData = {
        bestPrice: workItem.materialUnitPrice || 0,
        supplier: "Nincs online ajánlat",
        url: "",
        productName: "Nem elérhető",
        savings: 0,
        checkedAt: new Date().toISOString(),
      };

      const priceDataWithTimestamp = {
        ...priceData,
        lastRun: new Date().toISOString(),
      };

      await prisma.workItem.update({
        where: { id: workItemId },
        data: {
          currentMarketPrice: priceDataWithTimestamp,
          lastPriceCheck: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        workItemId,
        currentMarketPrice: priceDataWithTimestamp,
        message: "Nincs elérhető online ajánlat",
      });
    }

    // ==========================================
    // 🎯 KÉTLÉPCSŐS AI FELDOLGOZÁS
    // ==========================================
    console.log("🤖 [scrape-material-prices] Starting TWO-STEP AI processing...");

    // ==========================================
    // ELSŐ LÉPÉS: Kiválasztja a 2 legjobb terméket ahol az ár kinyerhető (NÉV + ÁR + INDEX)
    // ==========================================
    console.log("🤖 [scrape-material-prices] STEP 1: Selecting top 2 products with extractable prices...");

    // DEBUG: Log MINDEN mező minden találathoz
    console.log("\n📦 [DEBUG] TELJES TAVILY RESULT OBJEKTUM:");
    searchResults.results.slice(0, 15).forEach((r: any, idx: number) => {
      console.log(`\n========== INDEX ${idx} ==========`);
      console.log('TELJES OBJEKTUM:', JSON.stringify(r, null, 2));
      console.log(`========== VÉGE INDEX ${idx} ==========\n`);
    });

    const selectionPrompt = `🎯 ELSŐ LÉPÉS: TERMÉK KIVÁLASZTÁS

FELADATOD: Találd meg a TOP 2 LEGJOBB ajánlatot a keresési eredmények közül, ahol az ár KINYERHETŐ a content-ből.

🔍 KERESETT TERMÉK: "${searchTerm}"
Mennyiség: ${workItem.quantity} ${workItem.unit}
Jelenlegi ár: ${workItem.materialUnitPrice ? `${workItem.materialUnitPrice} Ft/${workItem.unit}` : 'nincs megadva'}

📦 KERESÉSI EREDMÉNYEK (15 találat indexelve 0-14-ig):
${JSON.stringify(searchResults.results.slice(0, 15).map((r: any, idx: number) => ({
  index: idx,
  title: r.title,
  content: r.content || 'Nincs tartalom' // TELJES content, ne vágjuk le!
})), null, 2)}

⚠️ KRITIKUS SZABÁLYOK:

1. ⚠️⚠️⚠️ CSAK AHOL ÁR KINYERHETŐ - LEGFONTOSABB SZABÁLY! ⚠️⚠️⚠️
   - CSAK ÉS KIZÁRÓLAG olyan találatokat válassz, ahol az árat KI TUDOD NYERNI a content mezőből!
   - ⚠️⚠️⚠️ KRITIKUS: CSAK az lehet ár, ahol "Ft" vagy "forint" szó VAN a szám mellett/után! ⚠️⚠️⚠️
   - Ha a content-ben NEM találsz számot "Ft" vagy "forint" közelében, HAGYD KI azt a terméket!
   - ÉRVÉNYES ár formátumok (ahol "Ft" szerepel!):
     * "2 499 Ft" ✅
     * "4 399 Ft" ✅
     * "1.990 Ft" ✅
     * "2499 Ft" ✅
     * "8.857 Ft-tól" ✅
     * "8857 Ft/kg" ✅
     * "Ár: 3490 Ft" ✅
   - ÉRVÉNYTELEN formátumok (nincs "Ft"):
     * "1990,-" ❌ (nincs "Ft"!)
     * "Ár: 3490" ❌ (nincs "Ft"!)
     * "2499" ❌ (csak szám, nincs "Ft"!)
   - Az ár lehet bárhol a content-ben: elején, közepén vagy végén!
   - ⚠️ KRITIKUS ÁR KIVÁLASZTÁS:
     * Ha TÖBB ár van (pl. régi ár, akciós ár, különböző kiszerelések), válaszd az ÉRVÉNYES/AKTUÁLIS árat
     * Figyelj oda az egységre: ha "Ft/kg" vagy "Ft/m²" van, azt használd!
     * NE keverd össze a "csomag ár"-at és az "egységár"-at!
     * Például: "25 kg-os csomag 8857 Ft" de keresünk "Ft/kg" árat → 8857/25 = 354 Ft/kg
   - ⚠️ Ha NEM találsz árat "Ft" szóval a content-ben, HAGYD KI azt a terméket! SOHA NE ADJ VISSZA 0 Ft-ot!
   - ⚠️ DUPLIKÁTUMOK ELKERÜLÉSE: Ha már kiválasztottál egy terméket egy indexről, NE válaszd ki újra!

2. TERMÉK KATEGÓRIA EGYEZÉS:
   - A keresett termék: "${searchTerm}"
   - CSAK hasonló termékeket válassz UGYANABBÓL a kategóriából!
   - Például: "Hulladékgyűjtő zsák" → "Törmelékgyűjtő zsák" ✅
   - Például: "Hulladékgyűjtő zsák" → "Kazettás álmennyezet" ❌ (TELJESEN más!)

3. VÁLASSZ PONTOSAN 2 LEGJOBB TERMÉKET:
   - MINIMUM: Ha csak 1 jó találat van ÁRAKKAL, adj vissza csak azt az 1-et
   - MAXIMUM: Legfeljebb 2 ajánlatot (NEM 3!)
   - Rendezd ár szerint NÖVEKVŐ sorrendben (legolcsóbb először)
   - ⚠️ KRITIKUS: Minden terméknek KÜLÖNBÖZŐ indexe legyen! (pl. index: 2, 5 - NE 2, 2!)
   - Próbálj különböző webshopokból/gyártóktól választani (diverzitás)

ADD VISSZA CSAK ÉRVÉNYES JSON formátumban:

{
  "selectedProducts": [
    {
      "index": <number, 0-14 között, az eredeti results[] index>,
      "productName": "<string, a termék neve results[index].title-ből>",
      "bestPrice": <number, az ár számként, Ft/${workItem.unit} egységben>,
      "reasoning": "<string, rövid indoklás: miért ezt választottad>"
    }
    // ... még max 1 termék (összesen 2 maximum!)
  ]
}

PÉLDA ÁR KERESÉSRE:

PÉLDA 1 - Egyszerű ár:
results[2].content = "KNAUF UNIGLETT gipszkarton 20kg. Kiváló minőség. Ár: 2 499 Ft. Azonnal átvehető."
→ Az ár: 2499 (eltávolítjuk a szóközöket és Ft-ot)
✅ HELYES: {"index": 2, "productName": "KNAUF UNIGLETT gipszkarton", "bestPrice": 2499}

PÉLDA 2 - Ár "-tól" formátumban:
results[7].content = "Weber glettanyag professzionális használatra. Kiváló tapadás. 8.857 Ft-tól 25 kg-os zsákban."
→ Az ár: 8857 (a "-tól" azt jelzi, hogy ez a minimum ár)
✅ HELYES: {"index": 7, "productName": "Weber glettanyag", "bestPrice": 8857}

PÉLDA 3 - Egységár (Ft/kg):
results[5].content = "Weber kos glett. 25 kg-os zsák. Kiszerelés: 25 kg. Ár: 8857 Ft. Egységár: 354 Ft/kg."
Keresett egység: kg
→ Az ár: 354 (az egységár Ft/kg-ban, NEM a csomag ára!)
✅ HELYES: {"index": 5, "productName": "Weber kos glett", "bestPrice": 354}
❌ ROSSZ: {"index": 5, "productName": "Weber kos glett", "bestPrice": 8857}
→ Ez a CSOMAG ára, nem az egységár!

PÉLDA 4 - Duplikátumok elkerülése:
Ha már kiválasztottad results[3]-at:
❌ ROSSZ: [{"index": 3, ...}, {"index": 3, ...}]  ← UGYANAZ kétszer!
✅ HELYES: [{"index": 3, ...}, {"index": 7, ...}]  ← Különböző indexek, maximum 2 db

PÉLDA 5 - Nincs ár (HAGYD KI!):
results[10].content = "Glett termék információ. Részletes leírás. Kapcsolat."
→ NINCS ár a content-ben!
✅ HELYES: NE válaszd ki ezt a terméket, keress másikat ahol VAN ár!

⚠️ Ha NEM találsz legalább 1 terméket ahol az ár KINYERHETŐ a content-ből:
{"selectedProducts": [{"index": -1, "productName": "Nincs online ajánlat", "bestPrice": ${workItem.materialUnitPrice || 0}, "reasoning": "Nem található megfelelő termék kinyerhető árral"}]}

Csak JSON-t adj vissza, semmi mást!`;

    let step1Response;
    try {
      step1Response = await fetch(
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
                content: "Te egy termékválasztó szakértő vagy. Elemezd a keresési eredményeket és válaszd ki a TOP 2 legjobb terméket ahol az ár KINYERHETŐ a content-ből. KRITIKUS: CSAK az lehet ár, ahol 'Ft' vagy 'forint' szó VAN a szám mellett/után! CSAK olyan termékeket válassz ahol az ár egyértelműen megtalálható 'Ft' szóval a content-ben! Ha nem találsz 'Ft' szót a szám mellett, HAGYD KI azt a terméket! Csak JSON-t adj vissza.",
              },
              { role: "user", content: selectionPrompt },
            ],
            max_tokens: 2000, // Növeltük 1000-ről 2000-re, hogy hosszabb választ tudjon adni
            temperature: 0.1,
          }),
        }
      );
    } catch (fetchError: unknown) {
      console.error("❌ [scrape-material-prices] STEP 1 OpenAI error:", fetchError);
      throw fetchError;
    }

    const step1Data = await step1Response.json();
    const step1Content: string = step1Data.choices?.[0]?.message?.content ?? "";
    console.log("📝 [scrape-material-prices] STEP 1 raw response:", step1Content);

    const step1Cleaned = step1Content
      .trim()
      .replace(/^```json[\r\n]*/i, "")
      .replace(/^```[\r\n]*/i, "")
      .replace(/```$/, "")
      .trim();

    let selectedProducts;
    try {
      selectedProducts = JSON.parse(step1Cleaned);
      console.log(`✅ [scrape-material-prices] STEP 1 selected ${selectedProducts.selectedProducts?.length || 0} product(s)`);
    } catch (jsonErr) {
      console.log("⚠️ [scrape-material-prices] STEP 1 JSON parse failed:", jsonErr);
      return NextResponse.json(
        {
          error: "Nem sikerült a termékeket kiválasztani (1. lépés).",
          rawContent: step1Content,
          details: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        },
        { status: 400 }
      );
    }

    // Handle "no products found" case
    if (!selectedProducts.selectedProducts || selectedProducts.selectedProducts.length === 0 || selectedProducts.selectedProducts[0]?.index === -1) {
      console.log("ℹ️ [scrape-material-prices] No suitable products found");
      const priceData = {
        bestPrice: workItem.materialUnitPrice || 0,
        supplier: "Nincs online ajánlat",
        url: "",
        productName: "Nem elérhető",
        savings: 0,
        checkedAt: new Date().toISOString(),
      };

      const priceDataWithTimestamp = {
        ...priceData,
        lastRun: new Date().toISOString(),
      };

      await prisma.workItem.update({
        where: { id: workItemId },
        data: {
          currentMarketPrice: priceDataWithTimestamp,
          lastPriceCheck: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        workItemId,
        currentMarketPrice: priceDataWithTimestamp,
        message: "Nincs elérhető online ajánlat (1. lépés)",
      });
    }

    // ==========================================
    // MÁSODIK LÉPÉS: URL hozzáadása a kiválasztott termékekhez
    // ==========================================
    console.log("🤖 [scrape-material-prices] STEP 2: Adding URLs to selected products...");

    const urlMappingPrompt = `🎯 MÁSODIK LÉPÉS: URL HOZZÁADÁS

Az első lépésben kiválasztottuk a TOP 2 terméket. Most add hozzá a PONTOS URL-eket!

📦 KIVÁLASZTOTT TERMÉKEK (1. lépésből):
${JSON.stringify(selectedProducts.selectedProducts, null, 2)}

📦 TELJES KERESÉSI EREDMÉNYEK (title + url):
${JSON.stringify(searchResults.results.slice(0, 15).map((r: any, idx: number) => ({
  index: idx,
  title: r.title,
  url: r.url
})), null, 2)}

⚠️ KRITIKUS SZABÁLY - URL PÁROSÍTÁS:

A kiválasztott termékek mindegyikéhez:
1. Nézd meg a termék "index" mezőjét (pl. index: 2)
2. Használd a results[2].url-t az URL mezőhöz!
3. Használd a results[2].url domain-jét a supplier meghatározásához (pl. "obi.hu" → "OBI")

PÉLDA:
Ha selectedProducts[0] = {"index": 2, "productName": "Törmelékgyűjtő zsák", "bestPrice": 1990}
És results[2] = {"title": "Törmelékgyűjtő zsák", "url": "https://www.obi.hu/zsak/tormelek/p/123"}
✅ HELYES: {"productName": "Törmelékgyűjtő zsák", "bestPrice": 1990, "url": "https://www.obi.hu/zsak/tormelek/p/123", "supplier": "OBI"}

ADD VISSZA CSAK ÉRVÉNYES JSON formátumban:

{
  "offers": [
    {
      "bestPrice": <number, az 1. lépésből>,
      "supplier": "<string, pl. OBI, Praktiker, Bauhaus - a domain alapján>",
      "url": "<string, PONTOSAN results[index].url>",
      "productName": "<string, az 1. lépésből>",
      "savings": <number, ${workItem.materialUnitPrice || 0} - bestPrice, ha pozitív, különben 0>,
      "checkedAt": "${new Date().toISOString()}"
    }
    // ... még max 1 ajánlat (összesen maximum 2!)
  ]
}

Csak JSON-t adj vissza, semmi mást!`;

    let step2Response;
    try {
      step2Response = await fetch(
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
                content: "Te egy URL párosító szakértő vagy. A kiválasztott termékekhez add hozzá a PONTOS URL-eket a megfelelő index alapján. SOHA ne keverd össze az indexeket! Csak JSON-t adj vissza.",
              },
              { role: "user", content: urlMappingPrompt },
            ],
            max_tokens: 1000,
            temperature: 0.1,
          }),
        }
      );
    } catch (fetchError: unknown) {
      console.error("❌ [scrape-material-prices] STEP 2 OpenAI error:", fetchError);
      throw fetchError;
    }

    const step2Data = await step2Response.json();
    const step2Content: string = step2Data.choices?.[0]?.message?.content ?? "";
    console.log("📝 [scrape-material-prices] STEP 2 raw response:", step2Content);

    const step2Cleaned = step2Content
      .trim()
      .replace(/^```json[\r\n]*/i, "")
      .replace(/^```[\r\n]*/i, "")
      .replace(/```$/, "")
      .trim();

    let priceData = null;

    try {
      priceData = JSON.parse(step2Cleaned);
      console.log("✅ [scrape-material-prices] STEP 2 price data parsed successfully");

      // Log how many offers were found
      if (priceData.offers && Array.isArray(priceData.offers)) {
        console.log(`📊 [scrape-material-prices] Final result: ${priceData.offers.length} offer(s)`);
      }
    } catch (jsonErr) {
      console.log("⚠️ [scrape-material-prices] STEP 2 JSON parse failed:", jsonErr);
      return NextResponse.json(
        {
          error: "Nem sikerült az URL-eket hozzáadni (2. lépés).",
          rawContent: step2Content,
          details: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VÁLASZ (NEM MENTJÜK AUTOMATIKUSAN!)
    // ==========================================

    // Add lastRun timestamp to the price data
    const priceDataWithTimestamp = {
      ...priceData,
      lastRun: new Date().toISOString(),
    };

    console.log("✅ [scrape-material-prices] Offers found, returning without saving");

    // NEM mentjük automatikusan - a frontend majd külön API híváson keresztül menti
    return NextResponse.json({
      success: true,
      workItemId,
      currentMarketPrice: priceDataWithTimestamp,
      message: "Árak sikeresen lekérdezve (még nincs mentve)",
      autoSaved: false, // Jelezzük, hogy nem történt automatikus mentés
    });
  } catch (err) {
    console.error("❌ [scrape-material-prices] Fatal error:", err);
    console.error(
      "❌ [scrape-material-prices] Error stack:",
      err instanceof Error ? err.stack : "No stack"
    );
    return NextResponse.json(
      {
        error: "Hiba történt az árak frissítése során.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// Helper function to process a single tenant's works
async function processTenantWorks(tenantEmail: string) {
  console.log(
    `📊 [scrape-material-prices] Processing works for: ${tenantEmail}`
  );

  // Get workItems that need price check (3 days old or never checked)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const workItemsToUpdate = await prisma.workItem.findMany({
    where: {
      tenantEmail,
      work: {
        status: { in: ["pending", "in_progress"] },
        isActive: true,
      },
      materialUnitPrice: { gt: 0 }, // Csak ahol van anyagköltség
      OR: [
        { lastPriceCheck: null },
        { lastPriceCheck: { lt: threeDaysAgo } },
      ],
    },
    select: {
      id: true,
      name: true,
      work: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    take: 50, // Limit to 50 items per batch to avoid timeout
  });

  console.log(
    `📊 [scrape-material-prices] Found ${workItemsToUpdate.length} items to update for ${tenantEmail}`
  );

  const results = {
    total: workItemsToUpdate.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Process each workItem (sequential to avoid rate limits)
  for (const workItem of workItemsToUpdate) {
    try {
      console.log(`🔄 Processing workItem ${workItem.id}: ${workItem.name}`);

      // Call the POST endpoint directly
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/scrape-material-prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workItemId: workItem.id,
            forceRefresh: false,
          }),
        }
      );

      if (response.ok) {
        results.success++;
      } else {
        results.failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error processing workItem ${workItem.id}:`, error);
      results.failed++;
    }
  }

  console.log(
    `✅ [scrape-material-prices] Batch update complete for ${tenantEmail}:`,
    results
  );

  return NextResponse.json({
    success: true,
    results,
    tenantEmail,
    message: `Frissítve ${results.success}/${results.total} tétel`,
  });
}

// Helper function to process all tenants (cron job)
async function processCronJob() {
  console.log("🤖 [scrape-material-prices] Starting cron job for all tenants");

  // Get all unique tenant emails with active works
  const tenants = await prisma.work.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      isActive: true,
    },
    select: {
      tenantEmail: true,
    },
    distinct: ["tenantEmail"],
  });

  console.log(
    `📊 [scrape-material-prices] Found ${tenants.length} tenants with active works`
  );

  const allResults = {
    totalTenants: tenants.length,
    processedTenants: 0,
    totalItems: 0,
    totalSuccess: 0,
    totalFailed: 0,
  };

  // Process each tenant sequentially
  for (const tenant of tenants) {
    try {
      console.log(
        `🔄 Processing tenant: ${tenant.tenantEmail} (${allResults.processedTenants + 1}/${tenants.length})`
      );

      const response = await processTenantWorks(tenant.tenantEmail);
      const data = await response.json();

      if (data.results) {
        allResults.totalItems += data.results.total;
        allResults.totalSuccess += data.results.success;
        allResults.totalFailed += data.results.failed;
      }

      allResults.processedTenants++;

      // Delay between tenants to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `❌ Error processing tenant ${tenant.tenantEmail}:`,
        error
      );
    }
  }

  console.log("✅ [scrape-material-prices] Cron job complete:", allResults);

  return NextResponse.json({
    success: true,
    results: allResults,
    message: `Frissítve ${allResults.totalSuccess}/${allResults.totalItems} tétel ${allResults.processedTenants} tenant számára`,
  });
}

// Batch endpoint to update all workItems for active works (ONLY for tenant's own works)
export async function GET(req: NextRequest) {
  console.log("\n🚀 [scrape-material-prices] Batch GET endpoint called");
  try {
    // ✅ SECURITY: Check authentication (cron secret OR authenticated user)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;
    let isCronJob = false;

    if (authHeader === `Bearer ${cronSecret}`) {
      console.log("✅ [scrape-material-prices] Cron secret valid");
      isAuthorized = true;
      isCronJob = true;
    } else {
      const user = await currentUser();
      if (user?.emailAddresses?.[0]?.emailAddress) {
        isAuthorized = true;
        console.log("✅ [scrape-material-prices] User authenticated");
      }
    }

    if (!isAuthorized) {
      console.log("❌ [scrape-material-prices] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If cron job, process ALL tenants' works
    if (isCronJob) {
      return await processCronJob();
    }

    // If manual request, process only current user's tenant works
    const user = await currentUser();
    const tenantEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!tenantEmail) {
      return NextResponse.json(
        { error: "Tenant email not found" },
        { status: 400 }
      );
    }

    return await processTenantWorks(tenantEmail);
  } catch (err) {
    console.error("❌ [scrape-material-prices] Batch fatal error:", err);
    return NextResponse.json(
      {
        error: "Hiba történt a batch frissítés során.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
