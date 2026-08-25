/**
 * Pure logic behind offer scenarios - the "what if" analyses run against an existing
 * offer under a stated constraint.
 *
 * Kept out of the "use server" action module because that may only export async
 * functions. Everything here is deterministic: the model contributes judgement, while
 * matching its suggestions back to real offer items happens in code.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* AI response schema                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Bounds are deliberate. An unbounded array from a model response becomes an unbounded
 * write, and an over-long analysis is less useful than a focused one anyway.
 */
const MAX_PHASES = 8;
const MAX_CUTS = 20;
const MAX_ALTERNATIVES = 20;
const MAX_RISKS = 10;

/**
 * Items are referenced by name throughout. The model has no way to know a real database
 * id, so asking for one would only invite it to invent plausible-looking values.
 */
const itemNameSchema = z.string().trim().min(1).max(300);

export const scenarioAnalysisSchema = z.object({
  summary: z.string().trim().min(1).max(2000),

  durationImpact: z.object({
    originalDays: z.number().int().min(0).max(3650).nullish(),
    adjustedDays: z.number().int().min(0).max(3650),
    explanation: z.string().trim().max(1500),
  }),

  phases: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        itemNames: z.array(itemNameSchema).max(100).optional(),
        rationale: z.string().trim().max(1000),
      })
    )
    .max(MAX_PHASES)
    .optional(),

  scopeCuts: z
    .array(
      z.object({
        itemName: itemNameSchema,
        action: z.enum(["drop", "defer"]),
        /** Money freed up. Null when the model cannot ground it in the offer. */
        savedAmount: z.number().min(0).nullish(),
        rationale: z.string().trim().max(1000),
      })
    )
    .max(MAX_CUTS)
    .optional(),

  alternatives: z
    .array(
      z.object({
        itemName: itemNameSchema,
        proposal: z.string().trim().min(1).max(1000),
        tradeoff: z.string().trim().max(1000),
      })
    )
    .max(MAX_ALTERNATIVES)
    .optional(),

  risks: z.array(z.string().trim().min(1).max(500)).max(MAX_RISKS).optional(),
});

export type ScenarioAnalysis = z.infer<typeof scenarioAnalysisSchema>;

/* -------------------------------------------------------------------------- */
/* Offer item matching                                                         */
/* -------------------------------------------------------------------------- */

/** The shape the generator needs from Offer.items, which is loosely typed JSON. */
export interface OfferItemRef {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  totalPrice?: number | null;
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Reads the item list out of Offer.items, which is JSON with no guaranteed shape:
 * different generations have written `task`, `name` or `title` for the same field.
 * Anything without a usable name is skipped rather than guessed at.
 */
export function extractOfferItems(items: unknown): OfferItemRef[] {
  if (!Array.isArray(items)) return [];

  const result: OfferItemRef[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const name = [item.name, item.task, item.title].find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0
    );
    if (!name) continue;

    const toNumber = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    result.push({
      name: name.trim(),
      quantity: toNumber(item.quantity),
      unit: typeof item.unit === "string" ? item.unit : null,
      totalPrice: toNumber(item.totalPrice) ?? toNumber(item.total),
    });
  }

  return result;
}

/**
 * Flags which referenced names correspond to real offer items.
 *
 * Unmatched names are kept but marked rather than dropped: the advice can legitimately
 * mention work that is not a line item ("hire a second tiler"), and silently deleting
 * part of an explanation would be worse than showing it without a link.
 */
export function markKnownItems(
  names: ReadonlyArray<string>,
  items: ReadonlyArray<OfferItemRef>
): Array<{ name: string; known: boolean }> {
  const index = new Set(items.map((item) => normalizeName(item.name)));
  return names.map((name) => ({
    name,
    known: index.has(normalizeName(name)),
  }));
}

/** Sums the claimed savings, ignoring entries the model left ungrounded. */
export function totalClaimedSavings(analysis: ScenarioAnalysis): number {
  return (analysis.scopeCuts ?? []).reduce(
    (sum, cut) => sum + (cut.savedAmount ?? 0),
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

export interface OfferScenarioDto {
  id: number;
  constraint: string;
  analysis: ScenarioAnalysis;
  baseTotalPrice: number;
  baseDurationText: string | null;
  createdAt: string;
  /**
   * True when the offer's total has moved since this scenario was produced, so the UI
   * can say the comparison is against an older version instead of quietly misleading.
   */
  offerChangedSince: boolean;
}

export const SCOPE_ACTION_LABELS: Record<"drop" | "defer", string> = {
  drop: "Elhagyható",
  defer: "Halasztható",
};
