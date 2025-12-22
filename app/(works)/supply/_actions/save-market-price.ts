"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface SaveMarketPriceParams {
  workItemId: number;
  offer: {
    bestPrice: number;
    supplier: string;
    url: string;
    productName: string;
    savings: number;
    checkedAt: string;
  };
}

export async function saveMarketPrice({ workItemId, offer }: SaveMarketPriceParams) {
  try {
    console.log(`💾 [save-market-price] Saving offer for workItem ${workItemId}`);

    // Mentjük az ajánlatot az adatbázisba
    const priceDataWithTimestamp = {
      offers: [offer], // Egy ajánlatot mentünk
      lastRun: new Date().toISOString(),
    };

    await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        currentMarketPrice: priceDataWithTimestamp,
        lastPriceCheck: new Date(),
      },
    });

    console.log(`✅ [save-market-price] Offer saved successfully`);

    // Revalidáljuk az oldalt, hogy frissüljön az UI
    revalidatePath("/supply");
    revalidatePath(`/supply/${workItemId}`);

    return {
      success: true,
      message: "Ajánlat sikeresen mentve",
    };
  } catch (error) {
    console.error("❌ [save-market-price] Error:", error);
    return {
      success: false,
      error: "Hiba történt a mentés során",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
