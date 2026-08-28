"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Info, TriangleAlert } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  ESETI_BEJEGYZES_CATEGORIES,
  UNSUPPORTED_POINTS,
  renderDateText,
  renderHeadcountText,
  renderPerformanceText,
  renderTemperatureText,
  renderWeatherText,
  type EnaploDailyReport,
} from "@/lib/enaplo/daily-report";

interface Props {
  workId: number;
  workTitle: string;
  location: string;
  reports: EnaploDailyReport[];
}

const CATEGORY_LABELS = new Map(ESETI_BEJEGYZES_CATEGORIES.map((c) => [c.code, c.label]));

/**
 * A day of our diary, laid out point by point as 191/2009. (IX. 15.) Korm. rendelet
 * requires the napi jelentés to be.
 *
 * Written against the regulation rather than against the ÁNYK screenshots, because the
 * annex that used to carry the diary template was repealed in 2024 and the body of the
 * regulation is now what says what a day must contain. Following it has a second
 * benefit: a requirement our diary cannot meet shows up as a stated gap instead of
 * quietly going missing.
 *
 * The final .enyk file can only be produced in the user's own ÁNYK, from the template
 * they personally downloaded — that binding is what proves who filed it. So this screen
 * does the part we legitimately can: it groups the day, words each point the way the
 * regulation asks, and puts it one tap from the clipboard.
 */
export default function EnaploExportClient({ workId, workTitle, location, reports }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);

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

  /** One lettered point of the napi jelentés. */
  function Point({
    code,
    title,
    blockKey,
    text,
    empty,
  }: {
    code: string;
    title: string;
    blockKey: string;
    text: string;
    empty: string;
  }) {
    const hasText = text.trim() !== "";
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
          <span className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] normal-case text-gray-500">
              {code})
            </span>
            {title}
          </span>
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
      <p className="mt-1 text-xs text-gray-500">{t("enaplo.legalBasis")}</p>

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
          <div>
            <p className="font-semibold">{t("enaplo.gapsTitle")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-800">
              {UNSUPPORTED_POINTS.map((point) => (
                <li key={point}>
                  <span className="font-mono text-xs">{point})</span> {t(`enaplo.gap.${point}`)}
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-amber-200 pt-2 text-amber-800">
              {t("enaplo.warnDeadline")}
            </p>
            <p className="mt-1 text-amber-800">{t("enaplo.warnAttachments")}</p>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">{t("enaplo.empty")}</p>
      ) : (
        <div className="mt-5 space-y-5">
          {reports.map((report) => (
            <section key={report.date} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900">{renderDateText(report)}</h2>
                <span className="text-xs text-gray-500">
                  {t("enaplo.headcountBadge", { count: String(report.headcountTotal) })}
                </span>
              </div>

              {report.weatherConflicts.length > 0 && (
                <p className="mb-2 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900">
                  {t("enaplo.weatherConflict", { values: report.weatherConflicts.join(", ") })}
                </p>
              )}

              <div className="space-y-2">
                <Point
                  code="ca"
                  title={t("enaplo.pointCa")}
                  blockKey={`${report.date}-date`}
                  text={renderDateText(report)}
                  empty={t("enaplo.noData")}
                />
                <Point
                  code="cb"
                  title={t("enaplo.pointCb")}
                  blockKey={`${report.date}-temperature`}
                  text={renderTemperatureText(report)}
                  empty={t("enaplo.noTemperature")}
                />
                <Point
                  code="cc"
                  title={t("enaplo.pointCc")}
                  blockKey={`${report.date}-weather`}
                  text={renderWeatherText(report)}
                  empty={t("enaplo.noWeather")}
                />
                <Point
                  code="cd"
                  title={t("enaplo.pointCd")}
                  blockKey={`${report.date}-headcount`}
                  text={renderHeadcountText(report)}
                  empty={t("enaplo.noHeadcount")}
                />
                <Point
                  code="ce"
                  title={t("enaplo.pointCe")}
                  blockKey={`${report.date}-performance`}
                  text={renderPerformanceText(report)}
                  empty={t("enaplo.noPerformance")}
                />
                <Point
                  code="cf"
                  title={t("enaplo.pointCf")}
                  blockKey={`${report.date}-waste`}
                  text=""
                  empty={t("enaplo.noWaste")}
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
                        className="rounded-md bg-gray-50 px-2 py-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm text-gray-800">{proposal.text}</span>
                          <CopyButton
                            blockKey={`${report.date}-incident-${index}`}
                            text={proposal.text}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          <span className="font-mono">{proposal.suggestedCategory})</span>{" "}
                          {CATEGORY_LABELS.get(proposal.suggestedCategory)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowCategories((open) => !open)}
          className="text-sm text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-800"
        >
          {showCategories ? t("enaplo.hideCategories") : t("enaplo.showCategories")}
        </button>
        {showCategories && (
          <ul className="mt-2 space-y-1 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
            {ESETI_BEJEGYZES_CATEGORIES.map((category) => (
              <li key={category.code}>
                <span className="font-mono text-xs text-gray-400">{category.code})</span>{" "}
                {category.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
