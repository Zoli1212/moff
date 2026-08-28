/**
 * The daily reports as spreadsheet rows.
 *
 * Kept apart from the download itself so the layout can be tested without a browser or
 * a spreadsheet library. The columns follow the regulation's lettered points rather than
 * our own field names, so a row lines up with what has to be filed.
 */

import {
  ESETI_BEJEGYZES_CATEGORIES,
  renderPerformanceText,
  renderTemperatureText,
  renderWeatherText,
  type EnaploDailyReport,
} from "./daily-report";

const CATEGORY_LABELS = new Map(ESETI_BEJEGYZES_CATEGORIES.map((c) => [c.code, c.label]));

/**
 * Headers stay Hungarian whatever the interface language is.
 *
 * The workbook is a record of a filing that 24/A. § (1) requires to be made in
 * Hungarian, so it is the language of the document, not of the reader.
 */
const LEGAL_BASIS =
  "A napi jelentés tartalma a 191/2009. (IX. 15.) Korm. rendelet szerint, ca)–cf) pont.";

export interface EnaploWorkbookMeta {
  workTitle: string;
  location: string;
}

/** The napi jelentés sheet: one row per day, one column per lettered point. */
export function buildDailySheetRows(
  reports: EnaploDailyReport[],
  meta: EnaploWorkbookMeta
): (string | number)[][] {
  const rows: (string | number)[][] = [
    [meta.workTitle + (meta.location ? ` — ${meta.location}` : "")],
    [LEGAL_BASIS],
    [],
    [
      "ca) Dátum",
      "ca) Nap",
      "cb) Mért külső hőmérséklet",
      "cc) Időjárási adatok",
      "cd) Létszám összesen",
      "cd) Létszám részletezve",
      "ce) Napi teljesítményadatok",
      "cf) Építési-bontási hulladék",
    ],
  ];

  for (const report of reports) {
    rows.push([
      report.date,
      report.dayName,
      renderTemperatureText(report),
      renderWeatherText(report),
      report.headcountTotal,
      // The name list, without the total line the copy block carries.
      report.headcount
        .map((row) => `${row.role || "Besorolás nélkül"}: ${row.names.length} fő (${row.names.join(", ")})`)
        .join("\n"),
      renderPerformanceText(report),
      // Left for the filer: our diary collects no waste data at all.
      "",
    ]);
  }

  return rows;
}

/** The eseti bejegyzés sheet: the day's problems and notes, with the suggested point. */
export function buildIncidentSheetRows(reports: EnaploDailyReport[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    ["Dátum", "Pont", "Kategória", "Bejegyzés", "Forrás"],
  ];

  for (const report of reports) {
    for (const proposal of report.incidentProposals) {
      rows.push([
        report.date,
        proposal.suggestedCategory,
        CATEGORY_LABELS.get(proposal.suggestedCategory) ?? "",
        proposal.text,
        proposal.source === "issues" ? "Probléma" : "Jegyzet",
      ]);
    }
  }

  return rows;
}

/** A filename that sorts by work and says what period it covers. */
export function buildWorkbookFilename(reports: EnaploDailyReport[], workId: number): string {
  if (reports.length === 0) return `e-naplo-${workId}.xlsx`;
  // buildDailyReports returns newest first.
  const newest = reports[0].date;
  const oldest = reports[reports.length - 1].date;
  const period = newest === oldest ? newest : `${oldest}_${newest}`;
  return `e-naplo-${workId}-${period}.xlsx`;
}
