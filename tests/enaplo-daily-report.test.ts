import { describe, expect, it } from "vitest";
import {
  budapestDayKey,
  buildDailyReports,
  renderHeadcountText,
  renderPerformanceText,
  renderWeatherText,
  type EnaploDiarySource,
} from "../lib/enaplo/daily-report";

function diary(overrides: Partial<EnaploDiarySource> & { id: number; date: string }): EnaploDiarySource {
  return {
    description: null,
    weather: null,
    temperature: null,
    progress: null,
    issues: null,
    notes: null,
    workItem: null,
    workDiaryItems: [],
    ...overrides,
  };
}

describe("budapestDayKey", () => {
  it("uses the Hungarian calendar day, not the UTC one", () => {
    // 22:00 UTC in summer is already the next day in Budapest (UTC+2).
    expect(budapestDayKey("2026-08-27T22:00:00Z")).toBe("2026-08-28");
    expect(budapestDayKey("2026-08-27T09:00:00Z")).toBe("2026-08-27");
  });

  it("handles winter time, when the offset is one hour", () => {
    expect(budapestDayKey("2026-01-15T23:30:00Z")).toBe("2026-01-16");
    expect(budapestDayKey("2026-01-15T22:30:00Z")).toBe("2026-01-15");
  });

  it("returns an empty key for an unusable date", () => {
    expect(budapestDayKey("not a date")).toBe("");
  });
});

describe("buildDailyReports", () => {
  it("collapses the day's work-item rows into one report", () => {
    const reports = buildDailyReports([
      diary({ id: 1, date: "2026-08-20T08:00:00Z", workItem: { id: 10, name: "Falazás" } }),
      diary({ id: 2, date: "2026-08-20T14:00:00Z", workItem: { id: 11, name: "Vakolás" } }),
      diary({ id: 3, date: "2026-08-21T08:00:00Z", workItem: { id: 10, name: "Falazás" } }),
    ]);

    expect(reports.map((r) => r.date)).toEqual(["2026-08-21", "2026-08-20"]);
    expect(reports[1].diaryIds).toEqual([1, 2]);
    expect(reports[1].performance.map((p) => p.workItemName)).toEqual(["Falazás", "Vakolás"]);
  });

  it("counts each worker once a day, however many items they logged", () => {
    const reports = buildDailyReports(
      [
        diary({
          id: 1,
          date: "2026-08-20T08:00:00Z",
          workItem: { id: 10, name: "Falazás" },
          workDiaryItems: [
            { workerId: 5, name: "Kiss Péter" },
            { workerId: 6, name: "Nagy Anna" },
          ],
        }),
        diary({
          id: 2,
          date: "2026-08-20T14:00:00Z",
          workItem: { id: 11, name: "Vakolás" },
          workDiaryItems: [{ workerId: 5, name: "Kiss Péter" }],
        }),
      ],
      { 5: { role: "kőműves" }, 6: { role: "segédmunkás" } }
    );

    expect(reports[0].headcountTotal).toBe(2);
    expect(reports[0].headcount).toEqual([
      { role: "kőműves", names: ["Kiss Péter"] },
      { role: "segédmunkás", names: ["Nagy Anna"] },
    ]);
  });

  it("keeps incompatible units apart instead of adding them up", () => {
    const reports = buildDailyReports([
      diary({
        id: 1,
        date: "2026-08-20T08:00:00Z",
        workItem: { id: 10, name: "Nyílászáró" },
        workDiaryItems: [
          { workerId: 5, quantity: 12, unit: "m2" },
          { workerId: 6, quantity: 3, unit: "db" },
          { workerId: 7, quantity: 8, unit: "m2" },
        ],
      }),
    ]);

    expect(reports[0].performance[0].quantities).toEqual([
      { amount: 3, unit: "db" },
      { amount: 20, unit: "m2" },
    ]);
  });

  it("records disagreeing weather rather than silently picking one", () => {
    const reports = buildDailyReports([
      diary({ id: 1, date: "2026-08-20T08:00:00Z", weather: "napos", temperature: 24 }),
      diary({ id: 2, date: "2026-08-20T14:00:00Z", weather: "esős" }),
      diary({ id: 3, date: "2026-08-20T16:00:00Z", weather: "napos" }),
    ]);

    expect(reports[0].weather).toBe("napos");
    expect(reports[0].weatherConflicts).toEqual(["esős"]);
    expect(reports[0].temperature).toBe(24);
  });

  it("offers problems and notes as incident proposals, tagged by origin", () => {
    const reports = buildDailyReports([
      diary({
        id: 1,
        date: "2026-08-20T08:00:00Z",
        issues: "Anyaghiány miatt állás délután.",
        notes: "  ",
      }),
      diary({ id: 2, date: "2026-08-20T09:00:00Z", notes: "Műszaki ellenőr helyszíni bejárása." }),
    ]);

    expect(reports[0].incidentProposals).toEqual([
      { diaryId: 1, text: "Anyaghiány miatt állás délután.", source: "issues" },
      { diaryId: 2, text: "Műszaki ellenőr helyszíni bejárása.", source: "notes" },
    ]);
  });

  it("survives rows with nothing filled in", () => {
    const reports = buildDailyReports([diary({ id: 1, date: "2026-08-20T08:00:00Z" })]);

    expect(reports).toHaveLength(1);
    expect(reports[0].headcountTotal).toBe(0);
    expect(reports[0].incidentProposals).toEqual([]);
  });

  it("skips rows whose date cannot be read", () => {
    const reports = buildDailyReports([diary({ id: 1, date: "nonsense" })]);
    expect(reports).toEqual([]);
  });
});

describe("rendering the ÁNYK blocks", () => {
  const [report] = buildDailyReports(
    [
      diary({
        id: 1,
        date: "2026-08-20T08:00:00Z",
        weather: "napos",
        temperature: 24.5,
        progress: 40,
        description: "Északi homlokzat falazása.",
        workItem: { id: 10, name: "Falazás" },
        workDiaryItems: [
          { workerId: 5, name: "Kiss Péter", quantity: 12, unit: "m2", workHours: 8 },
          { workerId: 6, name: "Nagy Anna", quantity: 8, unit: "m2", workHours: 6 },
        ],
      }),
    ],
    { 5: { role: "kőműves" }, 6: { role: "kőműves" } }
  );

  it("writes the performance block with quantities, hours and progress", () => {
    expect(renderPerformanceText(report)).toBe(
      "Falazás: 20 m2, 14 óra, készültség 40%\n  Északi homlokzat falazása."
    );
  });

  it("writes the headcount block with a total", () => {
    expect(renderHeadcountText(report)).toBe("kőműves: 2 fő (Kiss Péter, Nagy Anna)\nÖsszesen: 2 fő");
  });

  it("writes the weather block", () => {
    expect(renderWeatherText(report)).toBe("napos, 24.5 °C");
  });
});
