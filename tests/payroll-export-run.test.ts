import { describe, expect, it } from "vitest";
import {
  buildPayrollSheetRows,
  payrollExportFilename,
  type PayrollExportLabels,
} from "../lib/payroll/export-run";
import type { PayrollEntry, PayrollRun } from "../lib/payroll/types";

const LABELS: PayrollExportLabels = {
  worker: "Dolgozó",
  role: "Szakma",
  days: "Nap",
  hours: "Óra",
  gross: "Bruttó",
  total: "Összesen",
  note: "Megjegyzés",
  daysWithoutRate: (count) => `${count} nap napidíj nélkül`,
  daysPending: (count) => `${count} nap még jóváhagyásra vár`,
};

function entry(overrides: Partial<PayrollEntry> & { workerId: number; name: string }): PayrollEntry {
  return {
    workforceRegistryId: null,
    role: "Kőműves",
    daysWorked: 5,
    hoursWorked: 40,
    daysWithoutRate: 0,
    grossAmount: 250_000,
    daysPendingApproval: 0,
    ...overrides,
  };
}

function run(entries: PayrollEntry[]): PayrollRun {
  return {
    period: { from: "2026-09-01", to: "2026-09-30" },
    entries,
    currency: "HUF",
    totalGross: entries.reduce((sum, e) => sum + e.grossAmount, 0),
  };
}

describe("buildPayrollSheetRows", () => {
  it("fejléccel kezd, a felület nyelvén", () => {
    const rows = buildPayrollSheetRows(run([]), LABELS);
    expect(rows[0]).toEqual(["Dolgozó", "Szakma", "Nap", "Óra", "Bruttó", "Megjegyzés"]);
  });

  it("dolgozónként egy sort ad, a képernyőn látott értékekkel", () => {
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "Kovács Béla", daysWorked: 12, hoursWorked: 96, grossAmount: 600_000 })]),
      LABELS,
    );
    expect(rows[1]).toEqual(["Kovács Béla", "Kőműves", 12, 96, 600_000, ""]);
  });

  it("a számokat SZÁMKÉNT viszi ki, nem szövegként", () => {
    // Különben a könyvelő nem tud velük számolni Excelben.
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "A", daysWorked: 3, hoursWorked: 24, grossAmount: 150_000 })]),
      LABELS,
    );
    expect(typeof rows[1][2]).toBe("number");
    expect(typeof rows[1][3]).toBe("number");
    expect(typeof rows[1][4]).toBe("number");
  });

  it("üres szakma helyére gondolatjelet tesz", () => {
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "A", role: "" })]),
      LABELS,
    );
    expect(rows[1][1]).toBe("—");
  });

  it("a hiányzó napidíjat MEGJEGYZÉSKÉNT viszi ki, nem hallgatja el", () => {
    // A néma nulla rosszabb, mint a jelzett hiány: a könyvelő különben
    // kifizetne egy összeget, ami hiányos adatból jött.
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "A", daysWithoutRate: 3 })]),
      LABELS,
    );
    expect(rows[1][5]).toBe("3 nap napidíj nélkül");
  });

  it("a jóváhagyásra váró napokat is jelzi", () => {
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "A", daysPendingApproval: 2 })]),
      LABELS,
    );
    expect(rows[1][5]).toBe("2 nap még jóváhagyásra vár");
  });

  it("mindkét figyelmeztetést egy cellába fűzi", () => {
    const rows = buildPayrollSheetRows(
      run([entry({ workerId: 1, name: "A", daysWithoutRate: 1, daysPendingApproval: 4 })]),
      LABELS,
    );
    expect(rows[1][5]).toBe("1 nap napidíj nélkül; 4 nap még jóváhagyásra vár");
  });

  it("összesítő sorral zár, a futás végösszegével", () => {
    const sheet = run([
      entry({ workerId: 1, name: "A", grossAmount: 100_000 }),
      entry({ workerId: 2, name: "B", grossAmount: 250_000 }),
    ]);
    const rows = buildPayrollSheetRows(sheet, LABELS);
    expect(rows).toHaveLength(4); // fejléc + 2 dolgozó + összesen
    expect(rows[3][0]).toBe("Összesen");
    expect(rows[3][4]).toBe(350_000);
  });

  it("üres hónapnál is ad fejlécet és összesítőt", () => {
    const rows = buildPayrollSheetRows(run([]), LABELS);
    expect(rows).toHaveLength(2);
    expect(rows[1][4]).toBe(0);
  });

  it("megőrzi a dolgozók sorrendjét", () => {
    const rows = buildPayrollSheetRows(
      run([
        entry({ workerId: 1, name: "Első" }),
        entry({ workerId: 2, name: "Második" }),
        entry({ workerId: 3, name: "Harmadik" }),
      ]),
      LABELS,
    );
    expect([rows[1][0], rows[2][0], rows[3][0]]).toEqual(["Első", "Második", "Harmadik"]);
  });
});

describe("payrollExportFilename", () => {
  it("a hónapot a névbe teszi, hogy a fájlok ne írják felül egymást", () => {
    expect(payrollExportFilename("2026-09")).toBe("berszamfejtes-2026-09.xlsx");
    expect(payrollExportFilename("2025-12")).toBe("berszamfejtes-2025-12.xlsx");
  });
});
