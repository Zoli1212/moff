"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Info, TriangleAlert } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  renderHeadcountText,
  renderPerformanceText,
  renderWeatherText,
  type EnaploDailyReport,
} from "@/lib/enaplo/daily-report";

interface Props {
  workId: number;
  workTitle: string;
  location: string;
  reports: EnaploDailyReport[];
}

/**
 * A day of our diary, laid out as the ÁNYK offline napi jelentés asks for it.
 *
 * The final .enyk file can only be produced in the user's own ÁNYK, from the template
 * they personally downloaded — that binding is what proves who filed it. So this screen
 * does the part we legitimately can: it groups the day, words each block the way the
 * form expects, and puts it one tap from the clipboard.
 */
export default function EnaploExportClient({ workId, workTitle, location, reports }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success(t("enaplo.copied"));
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      toast.error(t("enaplo.copyFailed"));
    }
  }

  function CopyButton({ blockKey, text }: { blockKey: string; text: string }) {
    const isCopied = copied === blockKey;
    return (
      <button
        type="button"
        onClick={() => copy(blockKey, text)}
        disabled={text.trim() === ""}
        className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        {isCopied ? t("enaplo.copiedShort") : t("enaplo.copy")}
      </button>
    );
  }

  function Block({
    title,
    blockKey,
    text,
    empty,
  }: {
    title: string;
    blockKey: string;
    text: string;
    empty: string;
  }) {
    const hasText = text.trim() !== "";
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</span>
          <CopyButton blockKey={blockKey} text={text} />
        </div>
        <pre className="whitespace-pre-wrap break-words px-3 py-2 font-sans text-sm text-gray-800">
          {hasText ? text : <span className="text-gray-400">{empty}</span>}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-16 pt-4 sm:px-4">
      <Link
        href={`/diary/${workId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("enaplo.backToDiary")}
      </Link>

      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t("enaplo.title")}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {workTitle}
        {location ? ` — ${location}` : ""}
      </p>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{t("enaplo.howToTitle")}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-blue-800">
              <li>{t("enaplo.step1")}</li>
              <li>{t("enaplo.step2")}</li>
              <li>{t("enaplo.step3")}</li>
              <li>{t("enaplo.step4")}</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="list-disc space-y-0.5 pl-4">
            <li>{t("enaplo.warnDeadline")}</li>
            <li>{t("enaplo.warnHeadcount")}</li>
            <li>{t("enaplo.warnAttachments")}</li>
            <li>{t("enaplo.warnIncidents")}</li>
          </ul>
        </div>
      </div>

      {reports.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">{t("enaplo.empty")}</p>
      ) : (
        <div className="mt-5 space-y-5">
          {reports.map((report) => {
            const weather = renderWeatherText(report);
            const headcount = renderHeadcountText(report);
            const performance = renderPerformanceText(report);

            return (
              <section key={report.date} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-bold text-gray-900">{report.date}</h2>
                  <span className="text-xs text-gray-500">
                    {t("enaplo.headcountBadge", { count: String(report.headcountTotal) })}
                  </span>
                </div>

                {report.weatherConflicts.length > 0 && (
                  <p className="mb-2 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900">
                    {t("enaplo.weatherConflict", {
                      values: report.weatherConflicts.join(", "),
                    })}
                  </p>
                )}

                <div className="space-y-2">
                  <Block
                    title={t("enaplo.blockWeather")}
                    blockKey={`${report.date}-weather`}
                    text={weather}
                    empty={t("enaplo.noWeather")}
                  />
                  <Block
                    title={t("enaplo.blockHeadcount")}
                    blockKey={`${report.date}-headcount`}
                    text={headcount}
                    empty={t("enaplo.noHeadcount")}
                  />
                  <Block
                    title={t("enaplo.blockPerformance")}
                    blockKey={`${report.date}-performance`}
                    text={performance}
                    empty={t("enaplo.noPerformance")}
                  />
                </div>

                {report.incidentProposals.length > 0 && (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("enaplo.blockIncidents")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{t("enaplo.incidentsHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {report.incidentProposals.map((proposal, index) => (
                        <li
                          key={`${proposal.diaryId}-${proposal.source}-${index}`}
                          className="flex items-start justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5"
                        >
                          <span className="text-sm text-gray-800">{proposal.text}</span>
                          <CopyButton
                            blockKey={`${report.date}-incident-${index}`}
                            text={proposal.text}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
