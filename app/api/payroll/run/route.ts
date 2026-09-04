import { NextResponse } from "next/server";

import { resolveTenantFromApiKey } from "@/lib/payroll/api-keys";
import { loadPayrollRun, isMonthKey } from "@/lib/payroll/load-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A havi bérösszesítő lekérése külső bérszámfejtő rendszer számára.
 *
 *   GET /api/payroll/run?month=2026-09
 *   Authorization: Bearer ofpay_…
 *
 * Miért mi adunk API-t: nem találtunk olyan magyar bérprogramot, amely
 * nyilvános REST API-t adna külső hívónak, ezért a "mi hívjuk őket" irány
 * zsákutca (ld. lib/payroll/providers.ts). Megfordítva viszont működik: a
 * könyvelő rendszere lekéri tőlünk az adatot, fájlküldözgetés nélkül.
 *
 * Csak olvas. Ugyanazt a futást adja vissza, amit a képernyő mutat —
 * közös kódon (lib/payroll/load-run.ts), hogy a kettő ne térhessen el.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // Munkamenet helyett API-kulcs: gép hívja, nem böngésző. A bérlő magából
  // a kulcsból jön, ezért egy kulcs SOSE lát más bérlő adatát.
  const tenantEmail = await resolveTenantFromApiKey(
    request.headers.get("authorization") ?? request.headers.get("x-api-key"),
  );
  if (!tenantEmail) {
    // Szándékosan nem különböztetjük meg a hiányzó, ismeretlen és
    // visszavont kulcsot — abból csak a próbálkozó tanulna.
    return NextResponse.json(
      { error: "unauthorized", message: "Missing or invalid API key." },
      { status: 401 },
    );
  }

  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  if (month !== undefined && !isMonthKey(month)) {
    return NextResponse.json(
      {
        error: "invalid_month",
        message: "The 'month' parameter must be in YYYY-MM format, e.g. 2026-09.",
      },
      { status: 400 },
    );
  }

  try {
    const { run, month: resolved } = await loadPayrollRun(tenantEmail, month);
    return NextResponse.json({
      month: resolved,
      period: run.period,
      currency: run.currency,
      totalGross: run.totalGross,
      entries: run.entries,
    });
  } catch (error) {
    console.error("[payroll-api] run failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to build the payroll run." },
      { status: 500 },
    );
  }
}
