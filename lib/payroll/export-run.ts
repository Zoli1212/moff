/**
 * A havi bérösszesítő kivitele Excelbe.
 *
 * A könyvelő ma úgy jut az adathoz, hogy leolvassa a képernyőről. Amíg nincs
 * bérprogram, amit meg lehetne hívni, a fájl a járható út — és akkor is az
 * marad, ha valaki egyszerűen archiválni akarja a hónapot.
 *
 * A futás már a kliensen van (a képernyő abból rajzol), ezért a fájl ott is
 * készül el: nincs újabb szerver-hívás, és nem térhet el attól, amit a
 * felhasználó lát.
 */

import type { PayrollRun } from "./types";

/** Egy sor a kimeneti munkalapon. A fejlécek a hívótól jönnek, hogy a fájl a felület nyelvén szóljon. */
export interface PayrollExportLabels {
  worker: string;
  role: string;
  days: string;
  hours: string;
  gross: string;
  total: string;
  /** A figyelmeztetés-oszlop fejléce. */
  note: string;
  daysWithoutRate: (count: number) => string;
  daysPending: (count: number) => string;
}

/**
 * A munkalap tartalma sorok tömbjeként (fejléc + adatsorok + összesítő).
 *
 * Külön a fájlírástól, hogy tesztelhető maradjon: a sorokat ellenőrizni lehet
 * anélkül, hogy xlsx-et kellene visszaolvasni.
 */
export function buildPayrollSheetRows(
  run: PayrollRun,
  labels: PayrollExportLabels,
): (string | number)[][] {
  const rows: (string | number)[][] = [
    [labels.worker, labels.role, labels.days, labels.hours, labels.gross, labels.note],
  ];

  for (const entry of run.entries) {
    // A figyelmeztetések ugyanabba a fájlba kerülnek, ahol a szám van.
    // Külön lapon vagy elhagyva a könyvelő nem látná, hogy egy összeg
    // hiányos napidíjból jött — a néma nulla rosszabb, mint a jelzett hiány.
    const notes: string[] = [];
    if (entry.daysWithoutRate > 0) notes.push(labels.daysWithoutRate(entry.daysWithoutRate));
    if (entry.daysPendingApproval > 0) notes.push(labels.daysPending(entry.daysPendingApproval));

    rows.push([
      entry.name,
      entry.role || "—",
      entry.daysWorked,
      entry.hoursWorked,
      entry.grossAmount,
      notes.join("; "),
    ]);
  }

  rows.push([labels.total, "", "", "", run.totalGross, ""]);
  return rows;
}

/** A letöltött fájl neve, pl. "berszamfejtes-2026-09.xlsx". */
export function payrollExportFilename(month: string): string {
  return `berszamfejtes-${month}.xlsx`;
}
