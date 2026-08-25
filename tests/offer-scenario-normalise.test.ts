import { describe, expect, it } from "vitest";
import {
  coerceDays,
  normalizeRawAnalysis,
  scenarioAnalysisSchema,
} from "../lib/offer-scenario/schema";

/**
 * The first live run against offer 616 failed validation on five fields at once.
 * These tests pin that exact payload shape so it cannot regress.
 */
describe("normalizeRawAnalysis", () => {
  it("accepts the response shape that failed on the first live run", () => {
    const raw = {
      summary: "Feleannyi pénzből a teljes hidegburkolás nem fér bele.",
      durationImpact: {
        originalDays: "3-5 nap",
        adjustedDays: null,
        explanation: "Kevesebb pénz kevesebb párhuzamos szakembert jelent.",
      },
      scopeCuts: [
        {
          item: "Csempe anyag (40x40 cm)",
          reason: "Olcsóbb csempével kiváltható.",
          saving: "60 000 Ft",
        },
      ],
      alternatives: [
        {
          name: "Burkolás + fugázás",
          suggestion: "Nagyobb lapmérettel kevesebb a munkaóra.",
        },
      ],
    };

    const parsed = scenarioAnalysisSchema.safeParse(normalizeRawAnalysis(raw));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // "3-5 nap" keeps its lower bound; a null stays null instead of failing the parse.
    expect(parsed.data.durationImpact?.originalDays).toBe(3);
    expect(parsed.data.durationImpact?.adjustedDays).toBeNull();

    expect(parsed.data.scopeCuts?.[0]).toMatchObject({
      itemName: "Csempe anyag (40x40 cm)",
      action: "defer",
      savedAmount: 60000,
    });

    expect(parsed.data.alternatives?.[0]).toMatchObject({
      itemName: "Burkolás + fugázás",
      proposal: "Nagyobb lapmérettel kevesebb a munkaóra.",
      tradeoff: "",
    });
  });

  it("drops entries that cannot be salvaged instead of failing the analysis", () => {
    const raw = {
      summary: "Összefoglaló.",
      scopeCuts: [
        { rationale: "Nincs tételnév, ez nem menthető." },
        { itemName: "Burkolás + fugázás", action: "drop", rationale: "Elhagyható." },
      ],
      alternatives: [{ itemName: "Van neve, de nincs javaslat" }],
    };

    const parsed = scenarioAnalysisSchema.safeParse(normalizeRawAnalysis(raw));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.scopeCuts).toHaveLength(1);
    expect(parsed.data.scopeCuts?.[0].action).toBe("drop");
    expect(parsed.data.alternatives).toHaveLength(0);
  });

  it("keeps a well-formed response unchanged", () => {
    const raw = {
      summary: "Rendben.",
      durationImpact: { originalDays: 5, adjustedDays: 9, explanation: "Indok." },
      risks: ["Csúszhat a határidő."],
    };

    const parsed = scenarioAnalysisSchema.safeParse(normalizeRawAnalysis(raw));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.durationImpact?.adjustedDays).toBe(9);
    expect(parsed.data.risks).toEqual(["Csúszhat a határidő."]);
  });

  it("still rejects a response with no summary at all", () => {
    // The one case worth failing on: without a summary there is nothing to show.
    const parsed = scenarioAnalysisSchema.safeParse(
      normalizeRawAnalysis({ risks: ["valami"] })
    );
    expect(parsed.success).toBe(false);
  });
});

describe("coerceDays", () => {
  it.each([
    ["3-5 nap", 3],
    ["kb. 7 nap", 7],
    ["12", 12],
    [14, 14],
    [null, null],
    ["nincs megadva", null],
  ])("turns %o into %o", (input, expected) => {
    expect(coerceDays(input)).toBe(expected);
  });
});
