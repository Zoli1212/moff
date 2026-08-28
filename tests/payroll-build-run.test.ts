import { describe, expect, it } from "vitest";
import {
  buildPayrollRun,
  monthPeriod,
  payrollDayKey,
  type PayrollDiaryItem,
} from "../lib/payroll/build-run";
import { PROVIDERS, getActiveProvider } from "../lib/payroll/providers";

const AUGUST = monthPeriod(2026, 8);

function item(overrides: Partial<PayrollDiaryItem> & { workerId: number; date: string }): PayrollDiaryItem {
  return { workHours: null, dailyRateSnapshot: null, accepted: true, ...overrides };
}

describe("monthPeriod", () => {
  it("covers the whole month", () => {
    expect(monthPeriod(2026, 8)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(monthPeriod(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("knows about leap years", () => {
    expect(monthPeriod(2028, 2).to).toBe("2028-02-29");
  });
});

describe("payrollDayKey", () => {
  it("pays a late entry on the Hungarian day, not the UTC one", () => {
    expect(payrollDayKey("2026-08-31T22:30:00Z")).toBe("2026-09-01");
  });
});

describe("buildPayrollRun", () => {
  it("pays a day once, however many items were logged on it", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 5, date: "2026-08-03T08:00:00Z", workHours: 5, dailyRateSnapshot: 30000 }),
        item({ workerId: 5, date: "2026-08-03T13:00:00Z", workHours: 3, dailyRateSnapshot: 30000 }),
      ],
      { 5: { name: "Kiss Péter", role: "kőműves" } },
      AUGUST
    );

    expect(run.entries).toHaveLength(1);
    expect(run.entries[0].daysWorked).toBe(1);
    expect(run.entries[0].hoursWorked).toBe(8);
    // Paid once, not twice.
    expect(run.entries[0].grossAmount).toBe(30000);
  });

  it("honours a raise part way through the period", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 5, date: "2026-08-03T08:00:00Z", dailyRateSnapshot: 30000 }),
        item({ workerId: 5, date: "2026-08-04T08:00:00Z", dailyRateSnapshot: 35000 }),
      ],
      { 5: { name: "Kiss Péter" } },
      AUGUST
    );

    expect(run.entries[0].grossAmount).toBe(65000);
  });

  it("falls back to the registry rate when the day carries no snapshot", () => {
    const run = buildPayrollRun(
      [item({ workerId: 5, date: "2026-08-03T08:00:00Z" })],
      { 5: { name: "Kiss Péter", dailyRate: 28000 } },
      AUGUST
    );

    expect(run.entries[0].grossAmount).toBe(28000);
    expect(run.entries[0].daysWithoutRate).toBe(0);
  });

  it("counts a rateless day rather than pricing it at zero", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 5, date: "2026-08-03T08:00:00Z", dailyRateSnapshot: 30000 }),
        item({ workerId: 5, date: "2026-08-04T08:00:00Z" }),
      ],
      { 5: { name: "Kiss Péter" } },
      AUGUST
    );

    expect(run.entries[0].daysWorked).toBe(2);
    expect(run.entries[0].daysWithoutRate).toBe(1);
    // The unpriced day is absent from the gross, not folded in as nothing.
    expect(run.entries[0].grossAmount).toBe(30000);
  });

  it("treats a day as unapproved if any of its rows is", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 5, date: "2026-08-03T08:00:00Z", accepted: true, dailyRateSnapshot: 1 }),
        item({ workerId: 5, date: "2026-08-03T13:00:00Z", accepted: false }),
      ],
      { 5: { name: "Kiss Péter" } },
      AUGUST
    );

    expect(run.entries[0].daysPendingApproval).toBe(1);
  });

  it("leaves out work from outside the period", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 5, date: "2026-07-31T08:00:00Z", dailyRateSnapshot: 30000 }),
        item({ workerId: 5, date: "2026-08-01T08:00:00Z", dailyRateSnapshot: 30000 }),
        item({ workerId: 5, date: "2026-09-01T08:00:00Z", dailyRateSnapshot: 30000 }),
      ],
      { 5: { name: "Kiss Péter" } },
      AUGUST
    );

    expect(run.entries[0].daysWorked).toBe(1);
    expect(run.totalGross).toBe(30000);
  });

  it("totals every worker and sorts them by name", () => {
    const run = buildPayrollRun(
      [
        item({ workerId: 6, date: "2026-08-03T08:00:00Z", dailyRateSnapshot: 25000 }),
        item({ workerId: 5, date: "2026-08-03T08:00:00Z", dailyRateSnapshot: 30000 }),
      ],
      { 5: { name: "Kiss Péter" }, 6: { name: "Anna Nagy" } },
      AUGUST
    );

    expect(run.entries.map((e) => e.name)).toEqual(["Anna Nagy", "Kiss Péter"]);
    expect(run.totalGross).toBe(55000);
    expect(run.currency).toBe("HUF");
  });

  it("produces an empty run rather than failing on no work", () => {
    const run = buildPayrollRun([], {}, AUGUST);
    expect(run.entries).toEqual([]);
    expect(run.totalGross).toBe(0);
  });
});

describe("the provider registry", () => {
  it("is empty, because nothing is wired up yet", () => {
    expect(PROVIDERS).toEqual([]);
    expect(getActiveProvider()).toBeNull();
  });
});
