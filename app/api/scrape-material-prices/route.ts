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
    const { workItemId, forceRefresh } = body;

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
    const searchQuery = `${workItem.name} ${workItem.unit} ár site:obi.hu OR site:praktiker.hu OR site:bauhaus.hu OR site:leroymerlin.hu OR site:epitkereso.hu OR site:baumax.hu`;

    console.log("🔎 [scrape-material-prices] Search query:", searchQuery);

    let searchResults;
    try {
      searchResults = await tvly.search(searchQuery, {
        searchDepth: "advanced",
        maxResults: 10,
        includeDomains: [
          "obi.hu",
          "praktiker.hu",
          "bauhaus.hu",
          "leroymerlin.hu",
          "epitkereso.hu",
          "baumax.hu"
        ],
      });

      console.log("✅ [scrape-material-prices] Tavily search completed");
      console.log(`📊 [scrape-material-prices] Found ${searchResults.results?.length || 0} results`);
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

    // Use OpenAI to parse the search results and extract price information
    console.log("🤖 [scrape-material-prices] Using OpenAI to parse results...");

    const parsePrompt = `A következő keresési eredményekből találd meg a legjobb árat ehhez az építési anyaghoz:

Anyag: ${workItem.name}
Mennyiség: ${workItem.quantity} ${workItem.unit}
Jelenlegi ár: ${workItem.materialUnitPrice ? `${workItem.materialUnitPrice} Ft/${workItem.unit}` : 'nincs megadva'}

Keresési eredmények:
${JSON.stringify(searchResults.results.slice(0, 5), null, 2)}

Add vissza CSAK ÉRVÉNYES JSON formátumban a LEGOLCSÓBB ajánlatot:

{
  "bestPrice": <szám, Ft/${workItem.unit} egységben>,
  "supplier": "Kereskedő neve",
  "url": "https://teljes-url",
  "productName": "Pontos terméknév és kiszerelés",
  "savings": <szám, mennyit spórolunk>,
  "checkedAt": "${new Date().toISOString()}"
}

SZABÁLYOK:
- Ha nem találsz pontos árat az eredményekben, becsüld meg a szöveg alapján
- A savings = (jelenlegi ár - talált ár), ha pozitív akkor spórolunk
- Használd a results[].url mezőt a valódi URL-hez`;

    let openaiResponse;
    try {
      openaiResponse = await fetch(
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
                content: "Te egy árakat elemző szakértő vagy. Csak JSON-t adj vissza, semmi mást.",
              },
              { role: "user", content: parsePrompt },
            ],
            max_tokens: 500,
            temperature: 0.1,
          }),
        }
      );
    } catch (fetchError: unknown) {
      console.error("❌ [scrape-material-prices] OpenAI error:", fetchError);
      throw fetchError;
    }

    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    console.log("📝 [scrape-material-prices] OpenAI parsed content:", content);

    const cleaned = content
      .trim()
      .replace(/^```json[\r\n]*/i, "")
      .replace(/^```[\r\n]*/i, "")
      .replace(/```$/, "")
      .trim();

    let priceData = null;

    try {
      priceData = JSON.parse(cleaned);
      console.log("✅ [scrape-material-prices] Price data parsed successfully");
    } catch (jsonErr) {
      console.log("⚠️ [scrape-material-prices] JSON parse failed:", jsonErr);
      return NextResponse.json(
        {
          error: "Nem sikerült az árakat feldolgozni.",
          rawContent: content,
          details: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        },
        { status: 400 }
      );
    }

    // Add lastRun timestamp to the price data
    const priceDataWithTimestamp = {
      ...priceData,
      lastRun: new Date().toISOString(),
    };

    // Update the workItem with the new price data
    await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        currentMarketPrice: priceDataWithTimestamp,
        lastPriceCheck: new Date(),
      },
    });

    console.log("✅ [scrape-material-prices] WorkItem updated successfully");

    return NextResponse.json({
      success: true,
      workItemId,
      currentMarketPrice: priceDataWithTimestamp,
      message: "Árak sikeresen frissítve",
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
