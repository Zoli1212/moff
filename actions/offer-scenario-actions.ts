"use server";

/**
 * Server actions behind offer scenarios - read-only "what if" analyses of an existing
 * offer under a constraint.
 *
 * The offer is only ever read here. There is deliberately no offer.update call in this
 * module: a scenario is advice, and must never alter what was quoted.
 *
 * Only async functions may be exported from a "use server" module - schemas and types
 * live in lib/offer-scenario/schema.ts.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import {
  extractOfferItems,
  normalizeRawAnalysis,
  scenarioAnalysisSchema,
  type OfferScenarioDto,
  type ScenarioAnalysis,
} from "@/lib/offer-scenario/schema";
import {
  createOpenAiApiError,
  describeOpenAiFailure,
} from "@/lib/openai/errors";

function scenarioError(message: string): Error {
  const error = new Error(message) as Error & { userFacing?: boolean };
  error.userFacing = true;
  return error;
}

function toUserFacingMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    (error as { userFacing?: boolean }).userFacing
  ) {
    return (error as Error).message;
  }
  if ((error as { code?: string })?.code === "P2021") {
    return "Az alternatívák még nincsenek aktiválva ebben a környezetben: hiányzik az adatbázis-tábla. Futtasd le a migrációt (npx prisma migrate deploy).";
  }
  console.error("[offer-scenario] Unexpected error:", error);
  return "Váratlan hiba történt. Próbáld újra.";
}

/** Reads the offer and confirms it belongs to this tenant. Never writes. */
async function loadOwnedOffer(offerId: number, tenantEmail: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      totalPrice: true,
      workTotal: true,
      materialTotal: true,
      estimatedDuration: true,
      offerSummary: true,
      items: true,
      tenantEmail: true,
      requirementId: true,
      currency: true,
      exchangeRate: true,
    },
  });

  if (!offer || offer.tenantEmail !== tenantEmail) {
    throw scenarioError("Az ajánlat nem található.");
  }

  return offer;
}

export async function getOfferScenarios(offerId: number): Promise<{
  success: boolean;
  error?: string;
  offerTitle?: string;
  offerTotalPrice?: number;
  /** So the analysis renders its amounts in the currency the offer was quoted in. */
  offerCurrency?: string;
  offerExchangeRate?: number | null;
  scenarios?: OfferScenarioDto[];
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    const offer = await loadOwnedOffer(offerId, tenantEmail);

    const rows = await prisma.offerScenario.findMany({
      where: { offerId, tenantEmail },
      orderBy: { createdAt: "desc" },
    });

    const scenarios: OfferScenarioDto[] = [];
    for (const row of rows) {
      // A stored analysis is re-validated on read. If an older row no longer matches the
      // schema it is skipped rather than crashing the page for every other scenario.
      const parsed = scenarioAnalysisSchema.safeParse(row.analysis);
      if (!parsed.success) {
        console.warn(
          `[offer-scenario] stored analysis ${row.id} failed validation, skipping`
        );
        continue;
      }

      scenarios.push({
        id: row.id,
        constraint: row.constraint,
        analysis: parsed.data,
        baseTotalPrice: row.baseTotalPrice,
        baseDurationText: row.baseDurationText,
        createdAt: row.createdAt.toISOString(),
        offerChangedSince:
          Math.abs((offer.totalPrice ?? 0) - row.baseTotalPrice) > 0.5,
      });
    }

    return {
      success: true,
      offerTitle: offer.title,
      offerTotalPrice: offer.totalPrice,
      offerCurrency: offer.currency,
      offerExchangeRate: offer.exchangeRate,
      scenarios,
    };
  } catch (error) {
    return { success: false, error: toUserFacingMessage(error) };
  }
}

const SCENARIO_SYSTEM_PROMPT = `Te egy tapasztalt építőipari kivitelezés-tervező szakértő vagy. A felhasználó egy MÁR ELKÉSZÜLT árajánlatot mutat neked, és megad egy megszorító feltételt (pl. kevesebb ember, kevesebb pénz, kevesebb eszköz, rövidebb határidő).

A feladatod NEM új ajánlat készítése. A feladatod: megmutatni, hogy a megadott megszorítás mellett HOGYAN lehet mégis elvégezni a munkát, milyen alternatívák vannak, és minek mi az ára.

KÖTELEZŐ SZABÁLYOK:
1. Kizárólag JSON objektumot adj vissza, semmi mást.
2. SOHA ne adj vissza árajánlatot, tétellistát vagy új végösszeget. Te elemzel, nem árazol.
3. A tételekre a nevükkel hivatkozz, PONTOSAN úgy, ahogy a megadott listában szerepelnek. Ne találj ki tételt.
4. Csak azt állítsd, ami a megadott adatokból következik. Ha egy megtakarítást nem tudsz a tételekre alapozni, a "savedAmount" legyen null — ne becsülj vaktában.
5. Magyarul írj, tömören, a kivitelezőnek szólva.

A VÁLASZ MEZŐI:
- "summary": 2-3 mondat arról, hogy a megszorítás mellett mi a fő üzenet.
- "durationImpact": mennyivel változik az átfutás. "originalDays" az eredeti becslésből (ha nincs, null), "adjustedDays" a megszorítás melletti reális idő, "explanation" pedig az indoklás.
- "phases": ütemekre bontás. Mit érdemes előre venni, hogy a szűk erőforrás ne álljon, és a megrendelő hamarabb használatba vehessen egy részt. Minden ütemnél "itemNames" a hozzá tartozó tételekkel.
- "scopeCuts": mely tételek hagyhatók el ("drop") vagy halaszthatók ("defer"), és ez mennyi pénzt szabadít fel.
- "alternatives": olyan technológiai vagy anyag-alternatíva, ami kevesebb embert, eszközt vagy pénzt igényel. A "tradeoff" mezőben MINDIG írd meg, mit ad fel érte a megrendelő.
- "risks": mit kockáztat a megszorítás (minőség, garancia, csúszás).

Ha egy mezőhöz nincs érdemi mondanivalód, hagyd ki vagy adj üres tömböt. Inkább legyen rövid és igaz, mint hosszú és kitalált.`;

export async function createOfferScenario(
  offerId: number,
  constraint: string
): Promise<{ success: boolean; error?: string; scenarioId?: number }> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    const offer = await loadOwnedOffer(offerId, tenantEmail);

    const trimmed = constraint.trim();
    if (!trimmed) {
      return { success: false, error: "Írd le, mi a megszorítás." };
    }
    if (trimmed.length > 500) {
      return { success: false, error: "A megszorítás legfeljebb 500 karakter lehet." };
    }

    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: "Az OPENAI_API_KEY nincs beállítva." };
    }

    const items = extractOfferItems(offer.items);
    if (!items.length) {
      return {
        success: false,
        error: "Ehhez az ajánlathoz nincsenek tételek, így nincs mit elemezni.",
      };
    }

    // The original requirement gives the model the customer's intent, which the offer
    // alone does not carry - it matters when judging what may be cut.
    const requirement = await prisma.requirement.findUnique({
      where: { id: offer.requirementId },
      select: {
        title: true,
        description: true,
        itemsBlocks: { select: { blockText: true }, take: 10 },
      },
    });

    const itemLines = items
      .map((item) => {
        const quantity =
          item.quantity != null ? `${item.quantity} ${item.unit ?? ""}`.trim() : "-";
        const price =
          item.totalPrice != null
            ? `${Math.round(item.totalPrice).toLocaleString("hu-HU")} Ft`
            : "-";
        return `- ${item.name} | mennyiség: ${quantity} | ár: ${price}`;
      })
      .join("\n");

    const requirementText = requirement
      ? [
          `EREDETI IGÉNY: ${requirement.title}`,
          requirement.description ?? "",
          ...requirement.itemsBlocks.map((block) => block.blockText),
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, 4000)
      : "(nincs rögzített igény)";

    const userPrompt = `${requirementText}

AJÁNLAT: ${offer.title}
${offer.location ? `HELYSZÍN: ${offer.location}\n` : ""}VÉGÖSSZEG: ${Math.round(offer.totalPrice).toLocaleString("hu-HU")} Ft${
      offer.workTotal ? ` (ebből munkadíj: ${Math.round(offer.workTotal).toLocaleString("hu-HU")} Ft)` : ""
    }
BECSÜLT IDŐTARTAM: ${offer.estimatedDuration ?? "nincs megadva"}
${offer.offerSummary ? `ÖSSZEFOGLALÓ: ${offer.offerSummary}\n` : ""}
TÉTELEK:
${itemLines}

A MEGSZORÍTÁS, AMIRE VÁLASZT KÉREK:
"${trimmed}"

Elemezd a fenti szabályok szerint.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: SCENARIO_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw createOpenAiApiError(response.status, body);
    }

    const data = await response.json();
    const rawContent: unknown = data?.choices?.[0]?.message?.content;

    if (typeof rawContent !== "string" || !rawContent.trim()) {
      return { success: false, error: "Az AI üres választ adott. Próbáld újra." };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      console.error(
        "[offer-scenario] Unparseable AI response (truncated):",
        rawContent.slice(0, 500)
      );
      return { success: false, error: "Az AI válasza nem értelmezhető. Próbáld újra." };
    }

    // Normalise before validating. The model varies its key names and answers day counts
    // with text like "3-5 nap", and rejecting the whole analysis over that throws away
    // work that is mostly fine.
    const parsed = scenarioAnalysisSchema.safeParse(
      normalizeRawAnalysis(parsedJson)
    );
    if (!parsed.success) {
      console.error(
        "[offer-scenario] Validation failed after normalisation:",
        parsed.error.issues.slice(0, 5),
        "| raw keys:",
        Object.keys((parsedJson as Record<string, unknown>) ?? {})
      );
      return {
        success: false,
        error: "Az AI hibás szerkezetű elemzést adott. Próbáld újra.",
      };
    }

    const analysis: ScenarioAnalysis = parsed.data;

    const created = await prisma.offerScenario.create({
      data: {
        offerId,
        tenantEmail,
        constraint: trimmed,
        analysis,
        // Snapshot, so this scenario always compares against the offer it analysed.
        baseTotalPrice: offer.totalPrice,
        baseDurationText: offer.estimatedDuration,
      },
      select: { id: true },
    });

    revalidatePath(`/offers/${offer.requirementId}/scenarios`);
    return { success: true, scenarioId: created.id };
  } catch (error) {
    console.error("[offer-scenario] createOfferScenario failed:", error);
    const isInternal =
      (error as { userFacing?: boolean })?.userFacing === true ||
      /^P\d{4}$/.test((error as { code?: string })?.code ?? "");
    return {
      success: false,
      error: isInternal
        ? toUserFacingMessage(error)
        : describeOpenAiFailure(error),
    };
  }
}

export async function deleteOfferScenario(
  scenarioId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const scenario = await prisma.offerScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, tenantEmail: true, offer: { select: { requirementId: true } } },
    });

    if (!scenario || scenario.tenantEmail !== tenantEmail) {
      return { success: false, error: "Az alternatíva nem található." };
    }

    await prisma.offerScenario.delete({ where: { id: scenarioId } });

    revalidatePath(`/offers/${scenario.offer.requirementId}/scenarios`);
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserFacingMessage(error) };
  }
}
