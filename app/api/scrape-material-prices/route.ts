import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tavily } from "@tavily/core";
import * as cheerio from "cheerio";

// Helper function to fetch and parse HTML from a URL
async function fetchAndParseHTML(url: string): Promise<{ html: string; schema: any | null }> {
  try {
    console.log(`🌐 [fetchAndParseHTML] Fetching URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 } // Don't cache
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract JSON-LD schema
    let schema = null;
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).html() || '');
        // Look for Product schema
        if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData['@graph']) && jsonData['@graph'].some((item: any) => item['@type'] === 'Product'))) {
          schema = jsonData;
          console.log(`✅ [fetchAndParseHTML] Found Product schema`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    console.log(`✅ [fetchAndParseHTML] HTML fetched successfully, schema: ${schema ? 'found' : 'not found'}`);
    return { html, schema };
  } catch (error) {
    console.error(`❌ [fetchAndParseHTML] Error fetching ${url}:`, error);
    throw error;
  }
}

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
    // Add specific product indicators to avoid category pages
    // Using "buy", brand names, and specific size/package info helps find actual products
    const searchQuery = `${searchTerm} ${workItem.unit} termék vásárlás webshop bolt rendelés`;

    console.log("🔎 [scrape-material-prices] Search query:", searchQuery);
    if (materialName) {
      console.log("📦 [scrape-material-prices] Using material name:", materialName);
    }

    let searchResults;
    try {
      searchResults = await tvly.search(searchQuery, {
        searchDepth: "advanced",
        maxResults: 30,
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
    // 🌐 BRIGHT DATA / HTML FETCH LÉPÉS
    // ==========================================
    console.log("🌐 [scrape-material-prices] Fetching HTML from top URLs...");

    // Fetch HTML and extract schema for TOP 10 results (increased from 5 to find more products)
    const enrichedResults = await Promise.all(
      searchResults.results.slice(0, 10).map(async (result: any, idx: number) => {
        try {
          const { schema } = await fetchAndParseHTML(result.url);
          return {
            ...result,
            index: idx,
            schema: schema,
            priceFromSchema: schema?.offers?.price || schema?.offers?.[0]?.price || null
          };
        } catch (error) {
          console.log(`⚠️ [scrape-material-prices] Failed to fetch ${result.url}:`, error);
          return {
            ...result,
            index: idx,
            schema: null,
            priceFromSchema: null
          };
        }
      })
    );

    console.log(`✅ [scrape-material-prices] Enriched ${enrichedResults.length} results with HTML/Schema data`);

    // Log enriched results with schema prices
    enrichedResults.forEach((r: any) => {
      console.log(`\n  ${r.index}. ${r.title}`);
      console.log(`     URL: ${r.url}`);
      console.log(`     Schema Price: ${r.priceFromSchema || 'N/A'}`);
    });

    // ==========================================
    // 🎯 KÉTLÉPCSŐS AI FELDOLGOZÁS
    // ==========================================
    console.log("🤖 [scrape-material-prices] Starting TWO-STEP AI processing...");

    // ==========================================
    // ELSŐ LÉPÉS: Kiválasztja a legjobb terméket ahol az ár kinyerhető (NÉV + ÁR + INDEX)
    // ==========================================
    console.log("🤖 [scrape-material-prices] STEP 1: Selecting best product with extractable price...");

    // DEBUG: Log MINDEN mező minden találathoz (most már schema árral együtt!)
    console.log("\n📦 [DEBUG] ENRICHED RESULT OBJEKTUM (Schema árral):");
    enrichedResults.forEach((r: any) => {
      console.log(`\n========== INDEX ${r.index} ==========`);
      console.log('TITLE:', r.title);
      console.log('URL:', r.url);
      console.log('PRICE FROM SCHEMA:', r.priceFromSchema);
      console.log('SCHEMA:', r.schema ? JSON.stringify(r.schema, null, 2).substring(0, 500) + '...' : 'null');
      console.log(`========== VÉGE INDEX ${r.index} ==========\n`);
    });

    const selectionPrompt = `🎯 ELSŐ LÉPÉS: TERMÉK KIVÁLASZTÁS

FELADATOD: Találd meg a LEGJOBB 1 ajánlatot a keresési eredmények közül. Az árak már ki vannak nyerve a Schema/HTML-ből.

🔍 KERESETT TERMÉK: "${searchTerm}"
Mennyiség: ${workItem.quantity} ${workItem.unit}
Jelenlegi ár: ${workItem.materialUnitPrice ? `${workItem.materialUnitPrice} Ft/${workItem.unit}` : 'nincs megadva'}

📦 KERESÉSI EREDMÉNYEK (TOP 10 enriched találat):
${JSON.stringify(enrichedResults.map((r: any) => ({
  index: r.index,
  title: r.title,
  priceFromSchema: r.priceFromSchema,
  url: r.url,
  hasSchema: !!r.schema
})), null, 2)}

⚠️ KRITIKUS SZABÁLYOK:

1. ⚠️⚠️⚠️ KÖTELEZŐ: CSAK ÁR-RAL RENDELKEZŐ TERMÉKEK! ⚠️⚠️⚠️
   - ⚠️ KRITIKUS: CSAK olyan terméket válassz, ahol "priceFromSchema" NEM NULL!
   - Ha MINDEN termék priceFromSchema értéke NULL, NE válassz ki semmit! (index: -1)
   - A "priceFromSchema" a strukturált Schema.org adatokból lett kinyerve, ezért MEGBÍZHATÓ!
   - ⚠️ KATEGÓRIA OLDALAK KIZÁRÁSA:
     * Ha a title tartalmazza: "Ár 50.000 - 100.000" vagy hasonló ár tartományt → SKIP!
     * Ha a title tartalmazza: "Csaptelepek", "Bútorok", "Anyagok" (többes szám) → SKIP!
     * Csak KONKRÉT termék lehet (pl. "GROHE Eurosmart csaptelep" ✅, "Csaptelepek 50.000-100.000" ❌)

2. TERMÉK KATEGÓRIA EGYEZÉS:
   - A keresett termék: "${searchTerm}"
   - CSAK hasonló termékeket válassz UGYANABBÓL a kategóriából!
   - Például: "Hulladékgyűjtő zsák" → "Törmelékgyűjtő zsák" ✅
   - Például: "Hulladékgyűjtő zsák" → "Kazettás álmennyezet" ❌ (TELJESEN más!)
   - Például: "Bútorlap" → "Konyhabútor" ❌ (NE keverj össze hasonló nevű, de KÜLÖNBÖZŐ termékeket!)

3. VÁLASSZ PONTOSAN 1 LEGJOBB TERMÉKET:
   - Válaszd a LEGOLCSÓBB releváns KONKRÉT terméket ahol van priceFromSchema
   - ⚠️ Ha NINCS olyan termék ahol priceFromSchema NEM null, adj vissza index: -1

ADD VISSZA CSAK ÉRVÉNYES JSON formátumban:

{
  "selectedProducts": [
    {
      "index": <number, 0-9 között, az eredeti enrichedResults[] index>,
      "productName": "<string, a termék neve title-ből>",
      "bestPrice": <number, KÖTELEZŐ hogy priceFromSchema-ból jöjjön!>,
      "reasoning": "<string, rövid indoklás: miért ezt választottad>"
    }
  ]
}

PÉLDA KIVÁLASZTÁSRA:

PÉLDA 1 - Schema ár elérhető (HELYES):
enrichedResults[1] = {index: 1, title: "KNAUF bútorlap 18mm", priceFromSchema: 2499, hasSchema: true}
✅ HELYES:
{
  "selectedProducts": [
    {"index": 1, "productName": "KNAUF bútorlap 18mm", "bestPrice": 2499, "reasoning": "Legolcsóbb konkrét termék, schema ár elérhető"}
  ]
}

PÉLDA 2 - Minden termék priceFromSchema: null (SKIP):
enrichedResults = [
  {index: 0, title: "Csaptelepek Ár 50.000-100.000", priceFromSchema: null},
  {index: 1, title: "Fürdőszobai csaptelepek", priceFromSchema: null},
  ...mind null...
]
✅ HELYES:
{
  "selectedProducts": [
    {"index": -1, "productName": "Nincs online ajánlat", "bestPrice": ${workItem.materialUnitPrice || 0}, "reasoning": "Nincs konkrét termék árral, csak kategória oldalak"}
  ]
}

PÉLDA 3 - Kategória oldal ÁRAK nélkül (SKIP):
enrichedResults[2] = {index: 2, title: "Csaptelepek Ár 50.000 - 100.000 Ferro", priceFromSchema: null}
❌ ROSSZ: {"index": 2, ...} ← Ez kategória oldal, NE válaszd!
✅ HELYES: Keress tovább, vagy ha nincs jobb, adj vissza index: -1

⚠️ Ha NEM találsz legalább 1 KONKRÉT TERMÉKET ÁR-RAL:
{"selectedProducts": [{"index": -1, "productName": "Nincs online ajánlat", "bestPrice": ${workItem.materialUnitPrice || 0}, "reasoning": "Nem található konkrét termék árral"}]}

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
                content: "Te egy termékválasztó szakértő vagy. Elemezd a keresési eredményeket és válaszd ki a LEGJOBB 1 KONKRÉT terméket. KRITIKUS: CSAK olyan terméket válassz ahol priceFromSchema NEM null! Ha MINDEN termék priceFromSchema értéke null, adj vissza index: -1! SKIP kategória oldalakat (pl. 'Csaptelepek Ár 50.000-100.000')! NE keverj össze hasonló nevű, de különböző termékeket (pl. 'bútorlap' vs 'konyhabútor')! Csak JSON-t adj vissza.",
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

    const urlMappingPrompt = `🎯 MÁSODIK LÉPÉS: URL HOZZÁADÁS ÉS ÁR FINOMÍTÁS

Az első lépésben kiválasztottuk a LEGJOBB terméket. Most add hozzá a PONTOS URL-t és finomítsd az árat!

📦 KIVÁLASZTOTT TERMÉK (1. lépésből):
${JSON.stringify(selectedProducts.selectedProducts, null, 2)}

📦 ENRICHED KERESÉSI EREDMÉNYEK (title + url + priceFromSchema):
${JSON.stringify(enrichedResults.map((r: any) => ({
  index: r.index,
  title: r.title,
  url: r.url,
  priceFromSchema: r.priceFromSchema
})), null, 2)}

⚠️ KRITIKUS SZABÁLYOK:

1. URL PÁROSÍTÁS:
   - Nézd meg a termék "index" mezőjét (pl. index: 2)
   - Használd az enrichedResults[2].url-t az URL mezőhöz!
   - Használd a domain-t a supplier meghatározásához (pl. "obi.hu" → "OBI")

2. ÁR FINOMÍTÁS:
   - Ha az 1. lépésben a bestPrice NULL volt:
     * Nézd meg az enrichedResults[index].priceFromSchema mezőt
     * Ha NEM null, használd azt az árat
     * Ha NULL, akkor használd a jelenlegi árat (${workItem.materialUnitPrice || 0})
   - Ha az 1. lépésben már volt bestPrice, használd azt!

PÉLDA 1 - Már van ár:
selectedProducts[0] = {"index": 1, "productName": "KNAUF bútorlap", "bestPrice": 2499}
enrichedResults[1] = {"index": 1, "url": "https://obi.hu/...", "priceFromSchema": 2499}
✅ HELYES: {"productName": "KNAUF bútorlap", "bestPrice": 2499, "url": "https://obi.hu/...", "supplier": "OBI"}

PÉLDA 2 - Ár null volt, schema-ból vegyük:
selectedProducts[0] = {"index": 2, "productName": "Profi bútorlap", "bestPrice": null}
enrichedResults[2] = {"index": 2, "url": "https://praktiker.hu/...", "priceFromSchema": 3200}
✅ HELYES: {"productName": "Profi bútorlap", "bestPrice": 3200, "url": "https://praktiker.hu/...", "supplier": "Praktiker"}

PÉLDA 3 - Ár null, schema-ban sincs:
selectedProducts[0] = {"index": 3, "productName": "Budget bútorlap", "bestPrice": null}
enrichedResults[3] = {"index": 3, "url": "https://bauhaus.hu/...", "priceFromSchema": null}
✅ HELYES: {"productName": "Budget bútorlap", "bestPrice": ${workItem.materialUnitPrice || 0}, "url": "https://bauhaus.hu/...", "supplier": "Bauhaus"}

ADD VISSZA CSAK ÉRVÉNYES JSON formátumban:

{
  "offers": [
    {
      "bestPrice": <number, finomított ár a fenti szabályok szerint>,
      "supplier": "<string, pl. OBI, Praktiker, Bauhaus - a domain alapján>",
      "url": "<string, PONTOSAN enrichedResults[index].url>",
      "productName": "<string, az 1. lépésből>",
      "savings": <number, ${workItem.materialUnitPrice || 0} - bestPrice, ha pozitív, különben 0>,
      "checkedAt": "${new Date().toISOString()}"
    }
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
                content: "Te egy URL párosító és ár-finomító szakértő vagy. A kiválasztott termékekhez add hozzá a PONTOS URL-eket az enrichedResults alapján. Ha az 1. lépésben bestPrice null volt, próbáld meg priceFromSchema-ból kinyerni! SOHA ne keverd össze az indexeket! Csak JSON-t adj vissza.",
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
