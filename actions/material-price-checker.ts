"use server";

import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

interface MarketOffer {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
}

// Scraper functions (copied from existing scrape-material-prices API)
async function scrapeOBI(materialName: string, unit: string) {
  try {
    const searchUrl = `https://www.obi.hu/kereses/${encodeURIComponent(materialName)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const firstProduct = $(".product-tile").first();
    if (!firstProduct.length) return null;

    const productName =
      firstProduct.find(".product-tile__title").text().trim() ||
      materialName;
    const priceText = firstProduct.find(".price__value").text().trim();
    const productUrl = firstProduct.find("a").attr("href") || "";

    const price = parseFloat(priceText.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(price)) return null;

    return {
      supplier: "OBI",
      productName,
      price,
      url: productUrl.startsWith("http")
        ? productUrl
        : `https://www.obi.hu${productUrl}`,
      unit,
    };
  } catch (error) {
    console.error("OBI scraping error:", error);
    return null;
  }
}

async function scrapePraktiker(materialName: string, unit: string) {
  try {
    const searchUrl = `https://www.praktiker.hu/kereses?text=${encodeURIComponent(materialName)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const firstProduct = $(".product-item").first();
    if (!firstProduct.length) return null;

    const productName =
      firstProduct.find(".product-item-name").text().trim() || materialName;
    const priceText = firstProduct.find(".price").text().trim();
    const productUrl = firstProduct.find("a").attr("href") || "";

    const price = parseFloat(priceText.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(price)) return null;

    return {
      supplier: "Praktiker",
      productName,
      price,
      url: productUrl.startsWith("http")
        ? productUrl
        : `https://www.praktiker.hu${productUrl}`,
      unit,
    };
  } catch (error) {
    console.error("Praktiker scraping error:", error);
    return null;
  }
}

/**
 * Check market prices for a single material
 */
export async function checkMaterialPrice(
  materialId: number,
  materialName: string,
  unit: string,
  currentUnitPrice: number
): Promise<MarketOffer | null> {
  try {
    // Scrape from multiple sources
    const [obiResult, praktikerResult] = await Promise.all([
      scrapeOBI(materialName, unit),
      scrapePraktiker(materialName, unit),
    ]);

    const results = [obiResult, praktikerResult].filter(Boolean);

    if (results.length === 0) {
      return null;
    }

    // Find best offer
    const bestResult = results.reduce((best, current) => {
      if (!best) return current;
      return current!.price < best.price ? current : best;
    });

    if (!bestResult) return null;

    const savings = currentUnitPrice - bestResult.price;

    const offer: MarketOffer = {
      bestPrice: bestResult.price,
      supplier: bestResult.supplier,
      url: bestResult.url,
      productName: bestResult.productName,
      savings: savings > 0 ? savings : 0,
      checkedAt: new Date().toISOString(),
    };

    return offer;
  } catch (error) {
    console.error(`Error checking price for material ${materialId}:`, error);
    return null;
  }
}

/**
 * Daily cron job to check all material prices
 */
export async function runDailyMaterialPriceCheck() {
  console.log("Starting daily material price check...");

  try {
    // Get all materials (not just in-progress ones)
    const materials = await prisma.material.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        unitPrice: true,
        tenantEmail: true,
      },
    });

    console.log(`Found ${materials.length} materials to check`);

    let successCount = 0;
    let failCount = 0;

    // Process materials in batches to avoid overwhelming scrapers
    const batchSize = 10;
    for (let i = 0; i < materials.length; i += batchSize) {
      const batch = materials.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (material) => {
          try {
            const offer = await checkMaterialPrice(
              material.id,
              material.name,
              material.unit,
              material.unitPrice
            );

            if (offer) {
              await prisma.material.update({
                where: { id: material.id },
                data: {
                  bestOffer: offer as unknown as Record<string, unknown>,
                  updatedAt: new Date(),
                },
              });
              successCount++;
            } else {
              // Update timestamp even if no offer found
              await prisma.material.update({
                where: { id: material.id },
                data: {
                  updatedAt: new Date(),
                },
              });
              failCount++;
            }
          } catch (error) {
            console.error(`Error processing material ${material.id}:`, error);
            failCount++;
          }
        })
      );

      // Add delay between batches
      if (i + batchSize < materials.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(
      `Daily price check completed: ${successCount} successful, ${failCount} failed`
    );

    return {
      success: true,
      total: materials.length,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error("Error in daily material price check:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
