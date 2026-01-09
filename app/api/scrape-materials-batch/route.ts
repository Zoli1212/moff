import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

// Scrape single material price using Tavily API
async function scrapeMaterialPrice(material: {
  id: number;
  name: string;
  unit: string;
}) {
  try {
    console.log(`🔍 Scraping: ${material.name}`);

    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${material.name} ár ${material.unit} webshop budapest`,
        search_depth: "basic",
        include_answer: false,
        max_results: 3,
      }),
    });

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily API error: ${tavilyResponse.status}`);
    }

    const tavilyData = await tavilyResponse.json();
    const searchResults = tavilyData.results || [];

    if (searchResults.length === 0) {
      console.log(`⚠️ No results: ${material.name}`);
      return null;
    }

    const firstResult = searchResults[0];
    const priceMatch = firstResult.content?.match(/(\d+[\s,.]?\d*)\s*(Ft|forint)/i);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/[\s,]/g, ""));
      const url = firstResult.url;
      const hostname = new URL(url).hostname.replace("www.", "");
      const supplier = hostname.split(".")[0].toUpperCase();

      const bestOffer = {
        url,
        unit: material.unit,
        price,
        supplier,
        checkedAt: new Date().toISOString(),
        packageSize: `1 ${material.unit}`,
      };

      console.log(`✅ ${material.name}: ${price} Ft (${supplier})`);
      return bestOffer;
    }

    console.log(`⚠️ No price found: ${material.name}`);
    return null;
  } catch (error) {
    console.error(`❌ Error scraping ${material.name}:`, error);
    return null;
  }
}

// Process single tenant's materials
async function processTenantMaterials(tenantEmail: string) {
  console.log(`\n📊 [BATCH] Processing: ${tenantEmail}`);

  const materials = await prisma.material.findMany({
    where: { tenantEmail },
    select: {
      id: true,
      name: true,
      unit: true,
      bestOffer: true,
    },
    take: 100,
  });

  console.log(`📊 [BATCH] Found ${materials.length} materials`);

  const results = {
    total: materials.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ materialId: number; name: string; error: string }>,
  };

  for (const material of materials) {
    try {
      const bestOffer = await scrapeMaterialPrice(material);

      if (bestOffer) {
        await prisma.material.update({
          where: { id: material.id },
          data: {
            bestOffer,
            updatedAt: new Date(),
          },
        });
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          materialId: material.id,
          name: material.name,
          error: "No price found",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error: ${material.id}`, error);
      results.failed++;
      results.errors.push({
        materialId: material.id,
        name: material.name,
        error: (error as Error).message,
      });
    }
  }

  console.log(`✅ [BATCH] Complete:`, results);

  return {
    success: true,
    results,
    tenantEmail,
    message: `Frissítve ${results.success}/${results.total} anyag`,
  };
}

// Process ALL tenants (cron)
async function processCronJob() {
  console.log("\n🤖 [CRON] Starting batch for ALL tenants");

  const tenants = await prisma.material.groupBy({
    by: ["tenantEmail"],
    _count: { id: true },
  });

  console.log(`🤖 [CRON] Found ${tenants.length} tenants`);

  const allResults = {
    processedTenants: 0,
    totalItems: 0,
    totalSuccess: 0,
    totalFailed: 0,
  };

  for (const tenant of tenants) {
    try {
      console.log(`🔄 [CRON] Tenant ${allResults.processedTenants + 1}/${tenants.length}`);

      const result = await processTenantMaterials(tenant.tenantEmail);

      allResults.totalItems += result.results.total;
      allResults.totalSuccess += result.results.success;
      allResults.totalFailed += result.results.failed;
      allResults.processedTenants++;

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ [CRON] Tenant error:`, error);
    }
  }

  console.log("✅ [CRON] Complete:", allResults);

  return NextResponse.json({
    success: true,
    results: allResults,
    message: `Frissítve ${allResults.totalSuccess}/${allResults.totalItems} anyag`,
  });
}

export async function GET(req: NextRequest) {
  console.log("\n🚀 [scrape-materials-batch] GET called");

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;
    let isCronJob = false;

    if (authHeader === `Bearer ${cronSecret}`) {
      console.log("✅ [BATCH] Cron authorized");
      isAuthorized = true;
      isCronJob = true;
    } else {
      const user = await currentUser();
      if (user?.emailAddresses?.[0]?.emailAddress) {
        isAuthorized = true;
        console.log("✅ [BATCH] User authorized");
      }
    }

    if (!isAuthorized) {
      console.log("❌ [BATCH] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isCronJob) {
      return await processCronJob();
    }

    const user = await currentUser();
    const tenantEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!tenantEmail) {
      return NextResponse.json(
        { error: "Tenant email not found" },
        { status: 400 }
      );
    }

    const result = await processTenantMaterials(tenantEmail);
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [BATCH] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Batch scraping failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
