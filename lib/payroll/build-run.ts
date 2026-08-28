/**
 * Turns diary work into a payroll run.
 *
 * The diary is the only place that records who actually worked which day — the
 * WorkforceRegistryPerformance table exists but is not populated — so the run is built
 * from WorkDiaryItem, the same source the workforce ranking uses.
 *
 * Pure, so the money arithmetic can be tested without a database.
 */

import type { PayrollEntry, PayrollPeriod, PayrollRun } from "./types";

export interface PayrollDiaryItem {
  workerId: number;
  workforceRegistryId?: number | null;
  name?: string | null;
  date: Date | string;
  workHours?: number | null;
  /** The rate as it stood on the day, which is what the day should be paid at. */
  dailyRateSnapshot?: number | null;
  accepted?: boolean | null;
}

export interface PayrollWorkerInfo {
  name?: string | null;
  role?: string | null;
  /** Current rate, used only where the day carries no snapshot. */
  dailyRate?: number | null;
  workforceRegistryId?: number | null;
}

export interface PayrollWorkerLookup {
  [workerId: number]: PayrollWorkerInfo;
}

const BUDAPEST = "Europe/Budapest";

/** The Hungarian calendar day, so a late evening entry is not paid on the wrong date. */
export function payrollDayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: BUDAPEST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Rounds money to whole forint; payroll is not settled in fractions of a forint. */
function roundHuf(amount: number): number {
  return Math.round(amount);
}

/**
 * Builds one run for the period.
 *
 * A worker is paid per day, not per diary row, so several rows on one date collapse to a
 * single paid day. The rate comes from that day's own snapshot where there is one, which
 * means a raise part way through the period is honoured rather than applied to the whole
 * of it.
 */
export function buildPayrollRun(
  items: PayrollDiaryItem[],
  workers: PayrollWorkerLookup,
  period: PayrollPeriod
): PayrollRun {
  // date -> what we know about that worker's day
  const byWorker = new Map<
    number,
    Map<string, { rate: number | null; hours: number; accepted: boolean }>
  >();

  for (const item of items) {
    const day = payrollDayKey(item.date);
    if (day === "" || day < period.from || day > period.to) continue;

    let days = byWorker.get(item.workerId);
    if (!days) {
      days = new Map();
      byWorker.set(item.workerId, days);
    }

    const known = workers[item.workerId];
    const rate = isFiniteNumber(item.dailyRateSnapshot)
      ? item.dailyRateSnapshot
      : isFiniteNumber(known?.dailyRate)
        ? known.dailyRate
        : null;

    const existing = days.get(day);
    if (existing) {
      existing.hours += isFiniteNumber(item.workHours) ? item.workHours : 0;
      // A day is paid once; keep the first rate we established for it.
      if (existing.rate === null) existing.rate = rate;
      // The day is only settled if every row on it is.
      if (item.accepted !== true) existing.accepted = false;
    } else {
      days.set(day, {
        rate,
        hours: isFiniteNumber(item.workHours) ? item.workHours : 0,
        accepted: item.accepted === true,
      });
    }
  }

  const entries: PayrollEntry[] = [];

  for (const [workerId, days] of byWorker) {
    const known = workers[workerId];
    const fromItem = items.find((i) => i.workerId === workerId);

    let gross = 0;
    let hours = 0;
    let daysWithoutRate = 0;
    let daysPendingApproval = 0;

    for (const day of days.values()) {
      hours += day.hours;
      if (day.rate === null) daysWithoutRate += 1;
      else gross += day.rate;
      if (!day.accepted) daysPendingApproval += 1;
    }

    entries.push({
      workforceRegistryId:
        known?.workforceRegistryId ?? fromItem?.workforceRegistryId ?? null,
      workerId,
      name: cleanText(known?.name) ?? cleanText(fromItem?.name) ?? `#${workerId}`,
      role: cleanText(known?.role) ?? "",
      daysWorked: days.size,
      hoursWorked: Math.round(hours * 100) / 100,
      daysWithoutRate,
      grossAmount: roundHuf(gross),
      daysPendingApproval,
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, "hu"));

  return {
    period,
    entries,
    currency: "HUF",
    totalGross: roundHuf(entries.reduce((sum, entry) => sum + entry.grossAmount, 0)),
  };
}

/** The calendar month a date falls in, which is the usual payroll period. */
export function monthPeriod(year: number, month: number): PayrollPeriod {
  const pad = (value: number) => String(value).padStart(2, "0");
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}
