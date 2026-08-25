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

  /**
   * Optional as a whole, and nullable inside. A model asked for a day count will happily
   * answer "3-5 nap" or null when it cannot ground the estimate, and losing an otherwise
   * good analysis over that is a worse outcome than showing it without a number.
   * `normalizeRawAnalysis` coerces what it can before this runs.
   */
  durationImpact: z
    .object({
      originalDays: z.number().int().min(0).max(3650).nullish(),
      adjustedDays: z.number().int().min(0).max(3650).nullish(),
      explanation: z.string().trim().max(1500).default(""),
    })
    .optional(),

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
        action: z.enum(["drop", "defer"]).default("defer"),
        /** Money freed up. Null when the model cannot ground it in the offer. */
        savedAmount: z.number().min(0).nullish(),
        rationale: z.string().trim().max(1000).default(""),
      })
    )
    .max(MAX_CUTS)
    .optional(),

  alternatives: z
    .array(
      z.object({
        itemName: itemNameSchema,
        proposal: z.string().trim().min(1).max(1000),
        tradeoff: z.string().trim().max(1000).default(""),
      })
    )
    .max(MAX_ALTERNATIVES)
    .optional(),

  risks: z.array(z.string().trim().min(1).max(500)).max(MAX_RISKS).optional(),
});

export type ScenarioAnalysis = z.infer<typeof scenarioAnalysisSchema>;

/* -------------------------------------------------------------------------- */
/* Normalisation of the raw model response                                     */
/* -------------------------------------------------------------------------- */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** First present, non-empty value among a set of alias keys. */
function pick(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Turns a day count into a number.
 *
 * A model asked for days answers with whatever the source said - "3-5 nap", "kb. 7",
 * "7-10". The first integer is taken, which for a range is its lower bound: the
 * optimistic end of an estimate the user is about to compare against a constrained one.
 */
export function coerceDays(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Math.max(0, Number(match[0]));
  }
  return null;
}

function asAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

/**
 * Reshapes a raw model response into what the schema expects.
 *
 * Written because the first live run failed validation on five fields at once: day
 * counts came back as strings and nulls, and the entries inside scopeCuts and
 * alternatives used different key names than the prompt asked for. Prompts are requests;
 * this is where the guarantee lives.
 *
 * Entries that cannot be salvaged - no item name, no proposal - are dropped rather than
 * failing the whole analysis, so one malformed row cannot cost the other nine.
 */
export function normalizeRawAnalysis(raw: unknown): unknown {
  const source = asRecord(raw);
  if (!source) return raw;

  const result: Record<string, unknown> = {};

  const summary = asText(pick(source, "summary", "osszefoglalo", "overview"));
  if (summary) result.summary = summary;

  const durationRaw = asRecord(
    pick(source, "durationImpact", "duration", "idotartam")
  );
  if (durationRaw) {
    result.durationImpact = {
      originalDays: coerceDays(
        pick(durationRaw, "originalDays", "original", "eredeti")
      ),
      adjustedDays: coerceDays(
        pick(durationRaw, "adjustedDays", "adjusted", "modositott", "newDays")
      ),
      explanation:
        asText(pick(durationRaw, "explanation", "indoklas", "reason")) ?? "",
    };
  }

  const phasesRaw = pick(source, "phases", "utemek", "stages");
  if (Array.isArray(phasesRaw)) {
    result.phases = phasesRaw
      .map((entry) => {
        const phase = asRecord(entry);
        if (!phase) return null;
        const name = asText(pick(phase, "name", "title", "nev"));
        if (!name) return null;
        const itemNames = pick(phase, "itemNames", "items", "tetelek");
        return {
          name,
          itemNames: Array.isArray(itemNames)
            ? itemNames.map(asText).filter((value): value is string => Boolean(value))
            : undefined,
          rationale:
            asText(pick(phase, "rationale", "reason", "indoklas")) ?? "",
        };
      })
      .filter(Boolean);
  }

  const cutsRaw = pick(source, "scopeCuts", "cuts", "elhagyhato");
  if (Array.isArray(cutsRaw)) {
    result.scopeCuts = cutsRaw
      .map((entry) => {
        const cut = asRecord(entry);
        if (!cut) return null;
        const itemName = asText(
          pick(cut, "itemName", "item", "name", "title", "tetel")
        );
        if (!itemName) return null;

        const rawAction = asText(pick(cut, "action", "type", "muvelet"))?.toLowerCase();
        const action =
          rawAction === "drop" || rawAction === "elhagy" || rawAction === "remove"
            ? "drop"
            : "defer";

        return {
          itemName,
          action,
          savedAmount: asAmount(
            pick(cut, "savedAmount", "saving", "savings", "megtakaritas", "amount")
          ),
          rationale:
            asText(pick(cut, "rationale", "reason", "indoklas", "explanation")) ?? "",
        };
      })
      .filter(Boolean);
  }

  const altsRaw = pick(source, "alternatives", "alternativak", "options");
  if (Array.isArray(altsRaw)) {
    result.alternatives = altsRaw
      .map((entry) => {
        const alternative = asRecord(entry);
        if (!alternative) return null;
        const itemName = asText(
          pick(alternative, "itemName", "item", "name", "title", "tetel")
        );
        const proposal = asText(
          pick(alternative, "proposal", "suggestion", "javaslat", "description")
        );
        if (!itemName || !proposal) return null;
        return {
          itemName,
          proposal,
          tradeoff:
            asText(pick(alternative, "tradeoff", "tradeOff", "cost", "cserebe")) ?? "",
        };
      })
      .filter(Boolean);
  }

  const risksRaw = pick(source, "risks", "kockazatok", "warnings");
  if (Array.isArray(risksRaw)) {
    result.risks = risksRaw
      .map(asText)
      .filter((value): value is string => Boolean(value));
  }

  return result;
}

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
