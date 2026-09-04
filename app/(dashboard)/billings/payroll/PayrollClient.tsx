"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, PlugZap, TriangleAlert } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  buildPayrollSheetRows,
  payrollExportFilename,
} from "@/lib/payroll/export-run";
import type { PayrollRun } from "@/lib/payroll/types";

interface Props {
  run: PayrollRun | null;
  month: string;
  providerName: string | null;
  error: string | null;
  candidates: { name: string; note: string }[];
}

/** Shifts a YYYY-MM key by whole months. */
function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The payroll period, and the place a payroll system would be connected.
 *
 * Read-only by design: it derives the run from diary entries and stores nothing. The
 * submit path is missing because there is nothing to submit to yet — no Hungarian
 * payroll product we found publishes an API a third party can call.
 */
export default function PayrollClient({ run, month, providerName, error, candidates }: Props) {
  const { t, money } = useLocale();

  /**
   * A fájl a kliensen készül, ugyanabból a futásból, amit a táblázat mutat —
   * így nem térhet el attól, amit a felhasználó lát, és nem kell újabb
   * szerver-kör. Az xlsx-et csak kattintáskor töltjük be, hogy ne terhelje
   * az oldal első megjelenítését.
   */
  const handleExport = async (payrollRun: PayrollRun) => {
    const [{ default: XLSX }, { saveAs }] = await Promise.all([
      import("xlsx"),
      import("file-saver"),
    ]);
    const rows = buildPayrollSheetRows(payrollRun, {
      worker: t("payroll.colWorker"),
      role: t("payroll.colRole"),
      days: t("payroll.colDays"),
      hours: t("payroll.colHours"),
      gross: t("payroll.colGross"),
      total: t("payroll.total"),
      note: t("payroll.colNote"),
      daysWithoutRate: (count) => t("payroll.daysWithoutRate", { count: String(count) }),
      daysPending: (count) => t("payroll.daysPending", { count: String(count) }),
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 34 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, month);
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      payrollExportFilename(month),
    );
  };

  const hasEntries = run !== null && run.entries.length > 0;
  const flagged =
    run?.entries.filter((e) => e.daysWithoutRate > 0 || e.daysPendingApproval > 0) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-24 pt-4 sm:px-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t("payroll.title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("payroll.subtitle")}</p>

      {/* The integration seam, stated plainly rather than hidden behind a disabled button. */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-start gap-2">
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {providerName
                ? t("payroll.connectedTo", { name: providerName })
                : t("payroll.notConnected")}
            </p>
            {!providerName && (
              <>
                <p className="mt-1 text-sm text-gray-600">{t("payroll.notConnectedWhy")}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("payroll.candidatesTitle")}
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                  {candidates.map((candidate) => (
                    <li key={candidate.name}>
                      <span className="font-medium text-gray-700">{candidate.name}</span>
                      <span className="text-gray-500"> — {candidate.note}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {hasEntries && run && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => handleExport(run)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            {t("payroll.export")}
          </button>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-2">
        <Link
          href={`/billings/payroll?month=${shiftMonth(month, -1)}`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("payroll.previousMonth")}
        </Link>
        <span className="text-base font-bold text-gray-900">{month}</span>
        <Link
          href={`/billings/payroll?month=${shiftMonth(month, 1)}`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t("payroll.nextMonth")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!error && !hasEntries && (
        <p className="mt-8 text-center text-sm text-gray-500">{t("payroll.empty")}</p>
      )}

      {hasEntries && run && (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("payroll.colWorker")}</th>
                  <th className="px-3 py-2 font-semibold">{t("payroll.colRole")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("payroll.colDays")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("payroll.colHours")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("payroll.colGross")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {run.entries.map((entry) => (
                  <tr key={entry.workerId}>
                    <td className="px-3 py-2 font-medium text-gray-800">{entry.name}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.role || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {entry.daysWorked}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {entry.hoursWorked}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {money(entry.grossAmount, "HUF")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-900" colSpan={4}>
                    {t("payroll.total")}
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900">
                    {money(run.totalGross, "HUF")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {flagged.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{t("payroll.checkTitle")}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-800">
                    {flagged.map((entry) => (
                      <li key={entry.workerId}>
                        <span className="font-medium">{entry.name}</span>
                        {entry.daysWithoutRate > 0 && (
                          <>
                            {" — "}
                            {t("payroll.daysWithoutRate", {
                              count: String(entry.daysWithoutRate),
                            })}
                          </>
                        )}
                        {entry.daysPendingApproval > 0 && (
                          <>
                            {" — "}
                            {t("payroll.daysPending", {
                              count: String(entry.daysPendingApproval),
                            })}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">{t("payroll.grossNote")}</p>
        </>
      )}
    </div>
  );
}
