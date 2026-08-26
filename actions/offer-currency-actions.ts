"use server";

/**
 * Sets the currency an offer is quoted in.
 *
 * Writes exactly two columns and nothing else. Both were added for this feature, so the
 * offer's prices, items, status and totals are never touched by it - switching the
 * display currency cannot alter what was quoted.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import { isCurrency, type Currency } from "@/lib/i18n/config";

export async function setOfferCurrency(
  offerId: number,
  currency: string,
  exchangeRate: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    if (!isCurrency(currency)) {
      return { success: false, error: "Ismeretlen deviza." };
    }

    // A non-HUF quote is meaningless without the rate it was struck at, and storing a
    // rate for a HUF offer would be a value nobody can interpret later.
    const rate: number | null = currency === "HUF" ? null : exchangeRate;

    if (currency !== "HUF" && (!rate || rate <= 0)) {
      return {
        success: false,
        error: "Adj meg érvényes árfolyamot (1 EUR hány forint).",
      };
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, tenantEmail: true, requirementId: true },
    });

    if (!offer || offer.tenantEmail !== tenantEmail) {
      return { success: false, error: "Az ajánlat nem található." };
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { currency, exchangeRate: rate },
    });

    revalidatePath(`/offers/${offer.requirementId}`);
    return { success: true };
  } catch (error) {
    console.error("[offer-currency] setOfferCurrency failed:", error);
    return { success: false, error: "A deviza beállítása nem sikerült." };
  }
}

export async function getOfferCurrency(offerId: number): Promise<{
  success: boolean;
  error?: string;
  currency?: Currency;
  exchangeRate?: number | null;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { currency: true, exchangeRate: true, tenantEmail: true },
    });

    if (!offer || offer.tenantEmail !== tenantEmail) {
      return { success: false, error: "Az ajánlat nem található." };
    }

    return {
      success: true,
      currency: isCurrency(offer.currency) ? offer.currency : "HUF",
      exchangeRate: offer.exchangeRate,
    };
  } catch {
    return { success: false, error: "A deviza lekérése nem sikerült." };
  }
}
