"use server";

/**
 * Read-only payroll run.
 *
 * Purely additive: no create, update or delete of any kind. It derives a run from diary
 * entries that already exist and stores nothing, so it cannot affect an existing record.
 *
 * Only async functions may be exported from a "use server" module — the aggregation, the
 * provider port and its registry live under lib/payroll/.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import {
  buildPayrollRun,
  monthPeriod,
  type PayrollWorkerLookup,
} from "@/lib/payroll/build-run";
import { getActiveProvider } from "@/lib/payroll/providers";
import type { PayrollRun } from "@/lib/payroll/types";

function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export async function getPayrollRun(month?: string): Promise<{
  success: boolean;
  error?: string;
  run?: PayrollRun;
  /** Null while no payroll system is connected, which is the current state. */
  providerName?: string | null;
  month?: string;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    // Default to the month we are in; the diary is filled as the work happens.
    const now = new Date();
    const key = isMonthKey(month)
      ? month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [year, monthNumber] = key.split("-").map(Number);
    const period = monthPeriod(year, monthNumber);

    // A day's rate may have been set after the fact, so the window is widened by a day
    // on each side and the exact filtering is done against the Hungarian calendar day.
    const gte = new Date(`${period.from}T00:00:00Z`);
    gte.setUTCDate(gte.getUTCDate() - 1);
    const lte = new Date(`${period.to}T23:59:59Z`);
    lte.setUTCDate(lte.getUTCDate() + 1);

    const [items, registry] = await Promise.all([
      prisma.workDiaryItem.findMany({
        where: { tenantEmail, date: { gte, lte } },
        select: {
          workerId: true,
          workforceRegistryId: true,
          name: true,
          date: true,
          workHours: true,
          dailyRateSnapshot: true,
          accepted: true,
        },
      }),
      prisma.workforceRegistry.findMany({
        where: { tenantEmail, isDeleted: false },
        select: { id: true, name: true, role: true, dailyRate: true },
      }),
    ]);

    // Diary items carry the registry id, not the registry row, so the rate and role are
    // looked up through it.
    const byRegistryId = new Map(registry.map((entry) => [entry.id, entry]));
    const workers: PayrollWorkerLookup = {};
    for (const item of items) {
      if (workers[item.workerId]) continue;
      const known =
        item.workforceRegistryId != null ? byRegistryId.get(item.workforceRegistryId) : undefined;
      workers[item.workerId] = {
        name: known?.name ?? item.name,
        role: known?.role ?? "",
        dailyRate: known?.dailyRate ?? null,
        workforceRegistryId: item.workforceRegistryId ?? null,
      };
    }

    const run = buildPayrollRun(items, workers, period);

    return {
      success: true,
      run,
      providerName: getActiveProvider()?.name ?? null,
      month: key,
    };
  } catch (error) {
    console.error("[payroll] run failed:", error);
    return {
      success: false,
      error: "A bérszámfejtési adatok betöltése nem sikerült. Próbáld újra.",
    };
  }
}
