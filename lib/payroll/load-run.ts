/**
 * A havi bérösszesítő betöltése egy bérlőre.
 *
 * Külön a szerver-akciótól, mert két hívója van, és a kettő máshogy
 * azonosítja a bérlőt: a képernyő a bejelentkezett felhasználóból, a
 * lekérő API pedig az API-kulcsból. A számítás mindkét úton UGYANEZ —
 * különben a könyvelő mást kapna, mint amit a koordinátor lát.
 *
 * Csak olvas: naplóbejegyzésekből származtat, semmit nem tárol.
 */

import { prisma } from "@/lib/prisma";
import { buildPayrollRun, monthPeriod, type PayrollWorkerLookup } from "./build-run";
import type { PayrollRun } from "./types";

/** `YYYY-MM` alakú hónapkulcs. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** A kért hónap, vagy az aktuális, ha nincs megadva / érvénytelen. */
export function resolveMonthKey(month?: string): string {
  if (isMonthKey(month)) return month;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function loadPayrollRun(
  tenantEmail: string,
  month?: string,
): Promise<{ run: PayrollRun; month: string }> {
  const key = resolveMonthKey(month);
  const [year, monthNumber] = key.split("-").map(Number);
  const period = monthPeriod(year, monthNumber);

  // A napidíj utólag is beállítható, ezért az ablakot mindkét irányban egy
  // nappal tágítjuk, és a pontos szűrés a magyar naptári napra történik.
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

  // A naplósor a nyilvántartás id-jét hordozza, nem magát a sort — a
  // napidíj és a szakma ezen keresztül jön.
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

  return { run: buildPayrollRun(items, workers, period), month: key };
}
