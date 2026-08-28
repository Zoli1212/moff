import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  buildDailySheetRows,
  buildIncidentSheetRows,
  buildWorkbookFilename,
  type EnaploWorkbookMeta,
} from "@/lib/enaplo/workbook";
import type { EnaploDailyReport } from "@/lib/enaplo/daily-report";

/** Wide enough for the narrative columns to be readable without opening each cell. */
const DAILY_COLUMN_WIDTHS = [12, 12, 16, 26, 10, 34, 52, 30];
const INCIDENT_COLUMN_WIDTHS = [12, 8, 42, 60, 12];

/**
 * Downloads the daily reports as a workbook.
 *
 * Uses SheetJS rather than exceljs because that is what the app already ships to the
 * browser for its other exports, and a second spreadsheet library in the bundle would
 * buy nothing.
 */
export function downloadEnaploWorkbook(
  reports: EnaploDailyReport[],
  workId: number,
  meta: EnaploWorkbookMeta
): void {
  const workbook = XLSX.utils.book_new();

  const daily = XLSX.utils.aoa_to_sheet(buildDailySheetRows(reports, meta));
  daily["!cols"] = DAILY_COLUMN_WIDTHS.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, daily, "Napi jelentés");

  const incidentRows = buildIncidentSheetRows(reports);
  // The header row is always there; a sheet holding only that says nothing.
  if (incidentRows.length > 1) {
    const incidents = XLSX.utils.aoa_to_sheet(incidentRows);
    incidents["!cols"] = INCIDENT_COLUMN_WIDTHS.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, incidents, "Eseti bejegyzések");
  }

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    buildWorkbookFilename(reports, workId)
  );
}
