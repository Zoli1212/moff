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

import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { loadPayrollRun } from "@/lib/payroll/load-run";
import { getActiveProvider } from "@/lib/payroll/providers";
import type { PayrollRun } from "@/lib/payroll/types";

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

    // A számítás közös a lekérő API-val (lib/payroll/load-run.ts) — így a
    // könyvelő pontosan azt kapja, amit a koordinátor a képernyőn lát.
    const { run, month: key } = await loadPayrollRun(tenantEmail, month);

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
