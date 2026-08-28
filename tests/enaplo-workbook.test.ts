import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildDailyReports, type EnaploDiarySource } from "../lib/enaplo/daily-report";
import {
  buildDailySheetRows,
  buildIncidentSheetRows,
  buildWorkbookFilename,
} from "../lib/enaplo/workbook";

const META = { workTitle: "Kertvárosi társasház", location: "Budapest XI." };

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

const reports = buildDailyReports(
  [
    diary({
      id: 1,
      date: "2026-08-20T08:00:00Z",
      weather: "napos",
      temperature: 24.5,
      progress: 40,
      description: "Északi homlokzat falazása.",
      issues: "Anyagszállítás késett.",
      workItem: { id: 10, name: "Falazás" },
      workDiaryItems: [{ workerId: 5, name: "Kiss Péter", quantity: 12, unit: "m2", workHours: 8 }],
    }),
    diary({ id: 2, date: "2026-08-18T08:00:00Z", weather: "esős" }),
  ],
  { 5: { role: "kőműves" } }
);

describe("buildDailySheetRows", () => {
  it("heads the sheet with the work and the legal basis", () => {
    const rows = buildDailySheetRows(reports, META);
    expect(rows[0][0]).toBe("Kertvárosi társasház — Budapest XI.");
    expect(String(rows[1][0])).toContain("191/2009");
  });

  it("names every column after the regulation's lettered point", () => {
    const header = buildDailySheetRows(reports, META)[3].map(String);
    expect(header).toHaveLength(8);
    for (const point of ["ca)", "cb)", "cc)", "cd)", "ce)", "cf)"]) {
      expect(header.some((cell) => cell.startsWith(point))).toBe(true);
    }
  });

  it("writes one row per day, newest first", () => {
    const rows = buildDailySheetRows(reports, META);
    expect(rows).toHaveLength(4 + 2);
    expect(rows[4][0]).toBe("2026-08-20");
    expect(rows[5][0]).toBe("2026-08-18");
  });

  it("keeps the headcount as a number so the column can be totalled", () => {
    const rows = buildDailySheetRows(reports, META);
    expect(rows[4][4]).toBe(1);
  });

  it("leaves the waste column empty, since we collect nothing for it", () => {
    const rows = buildDailySheetRows(reports, META);
    expect(rows[4][7]).toBe("");
    expect(rows[5][7]).toBe("");
  });
});

describe("buildIncidentSheetRows", () => {
  it("carries the suggested point and its label", () => {
    const rows = buildIncidentSheetRows(reports);
    expect(rows[0]).toEqual(["Dátum", "Pont", "Kategória", "Bejegyzés", "Forrás"]);
    expect(rows[1][0]).toBe("2026-08-20");
    expect(rows[1][1]).toBe("di");
    expect(String(rows[1][2])).toContain("Munkavégzést gátló");
    expect(rows[1][4]).toBe("Probléma");
  });

  it("returns the header alone when nothing was logged", () => {
    expect(buildIncidentSheetRows([])).toHaveLength(1);
  });
});

describe("the workbook as an actual file", () => {
  /**
   * Written because the PDF route could not carry Hungarian: jsPDF's standard fonts are
   * WinAnsi encoded, which has no ő or ű. A spreadsheet stores UTF-8 XML and should not
   * have that problem — this pins it rather than trusting it.
   */
  it("round-trips Hungarian text through a real xlsx", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(buildDailySheetRows(reports, META)),
      "Napi jelentés"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const reopened = XLSX.read(buffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<string[]>(reopened.Sheets["Napi jelentés"], {
      header: 1,
    });

    expect(reopened.SheetNames).toContain("Napi jelentés");
    expect(rows[0][0]).toBe("Kertvárosi társasház — Budapest XI.");
    // The long umlauts are exactly what a WinAnsi encoding would have destroyed.
    expect(rows[4].join(" ")).toContain("kőműves");
    expect(rows[4].join(" ")).toContain("Északi homlokzat falazása.");
  });
});

describe("buildWorkbookFilename", () => {
  it("spans the period the export covers", () => {
    expect(buildWorkbookFilename(reports, 135)).toBe("e-naplo-135-2026-08-18_2026-08-20.xlsx");
  });

  it("names a single day once", () => {
    expect(buildWorkbookFilename([reports[0]], 135)).toBe("e-naplo-135-2026-08-20.xlsx");
  });

  it("still produces a name with nothing to export", () => {
    expect(buildWorkbookFilename([], 135)).toBe("e-naplo-135.xlsx");
  });
});
