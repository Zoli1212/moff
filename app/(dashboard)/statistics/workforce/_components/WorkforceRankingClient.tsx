"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Info, Medal, TrendingDown, Users } from "lucide-react";
import { getWorkforceRanking } from "@/actions/workforce-ranking-actions";
import { useLocale } from "@/components/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import {
  RANKING_METRICS,
  flattenRanking,
  type RankingMetric,
  type WorkerStats,
} from "@/lib/workforce-ranking/schema";

const BRAND = "#FE9C00";

const PERIODS = ["30", "90", "365", "all"] as const;

export default function WorkforceRankingClient() {
  const { t } = useLocale();
  const [metric, setMetric] = useState<RankingMetric>("hours");
  const [period, setPeriod] = useState("90");

  const query = useQuery({
    queryKey: ["workforce-ranking", metric, period],
    queryFn: () => getWorkforceRanking({ metric, period }),
  });

  const groups = query.data?.groups ?? [];
  const coverage = query.data?.coverage;
  const everyone = flattenRanking(groups);

  // Only people with logged work can be ranked; the rest have nothing to compare.
  const active = everyone.filter((entry) => entry.entries > 0);
  const best = [...active]
    .sort((a, b) => metricOf(b, metric) - metricOf(a, metric))
    .slice(0, 3);
  const weakest = [...active]
    .sort((a, b) => metricOf(a, metric) - metricOf(b, metric))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24">
      <header className="flex items-center gap-3 pt-6">
        <Link
          href="/statistics"
          aria-label={t("x.backToStats")}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          style={{ color: BRAND }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {t("ranking.title")}
          </h1>
          <p className="text-xs text-gray-500">
            {t("ranking.subtitle")}
          </p>
        </div>
        <LocaleSwitcher className="ml-auto" />
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={metric}
          onChange={(event) => setMetric(event.target.value as RankingMetric)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {RANKING_METRICS.map((value) => (
            <option key={value} value={value}>
              {t(`ranking.${value}`)}
            </option>
          ))}
        </select>

        <div className="flex rounded-full bg-gray-100 p-1">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                period === value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {t(`ranking.period.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {/*
        Stated up front rather than buried. Roughly a third of diary entries carry no
        named worker, and without saying so these totals would read as complete.
      */}
      {coverage && coverage.attributedPercent < 100 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t("ranking.coverage", {
              total: coverage.totalEntries,
              attributed: coverage.attributedEntries,
              percent: coverage.attributedPercent,
            })}
          </span>
        </p>
      )}

      {query.isLoading ? (
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-gray-100" />
      ) : query.data && !query.data.success ? (
        <p className="mt-8 text-center text-sm text-gray-600">
          {query.data.error}
        </p>
      ) : active.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          {t("ranking.empty")}
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Highlight
              tone="good"
              icon={<Medal className="h-4 w-4" />}
              title={t("ranking.best")}
              metric={metric}
              people={best}
            />
            <Highlight
              tone="weak"
              icon={<TrendingDown className="h-4 w-4" />}
              title={t("ranking.weakest")}
              metric={metric}
              people={weakest}
            />
          </div>

          <p className="mt-4 text-xs text-gray-500">{t("ranking.withinTrade")}</p>

          <div className="mt-4 space-y-4">
            {groups.map((group) => (
              <section
                key={group.role}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Users className="h-4 w-4 text-gray-400" />
                    {group.role}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {group.headcount} {t("ranking.headcount")}
                  </span>
                  <span className="text-xs text-gray-500">
                    {group.totalHours} {t("ranking.hoursShort")}
                  </span>
                  {group.acceptanceRate != null && (
                    <span className="text-xs text-gray-500">
                      {group.acceptanceRate}% {t("ranking.acceptedShort")}
                    </span>
                  )}
                </header>

                <ul>
                  {group.members.map((member) => (
                    <li
                      key={member.worker.id}
                      className={`flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 last:border-b-0 ${
                        member.entries === 0 ? "opacity-50" : ""
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-semibold text-gray-400">
                        {member.entries > 0 ? member.rankInRole : "–"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                        {member.worker.name}
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {member.hours} {t("ranking.hoursShort")} · {member.activeDays}{" "}
                        {t("ranking.daysShort")} · {member.worksCount}{" "}
                        {t("ranking.jobsShort")}
                      </span>
                      <span className="w-12 shrink-0 text-right text-sm font-medium text-gray-900">
                        {formatMetric(member, metric)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function metricOf(stats: WorkerStats, metric: RankingMetric): number {
  if (metric === "acceptanceRate") return stats.acceptanceRate ?? -1;
  if (metric === "activeDays") return stats.activeDays;
  if (metric === "worksCount") return stats.worksCount;
  return stats.hours;
}

function formatMetric(stats: WorkerStats, metric: RankingMetric): string {
  if (metric === "acceptanceRate") {
    return stats.acceptanceRate != null ? `${stats.acceptanceRate}%` : "–";
  }
  return String(metricOf(stats, metric));
}

function Highlight({
  tone,
  icon,
  title,
  metric,
  people,
}: {
  tone: "good" | "weak";
  icon: React.ReactNode;
  title: string;
  metric: RankingMetric;
  people: WorkerStats[];
}) {
  const { t } = useLocale();
  const label = t(`ranking.${metric}`);

  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "good"
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <h2
        className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${
          tone === "good" ? "text-green-900" : "text-amber-900"
        }`}
      >
        {icon}
        {title}
        <span className="font-normal opacity-70">
          — {label.toLowerCase()}
        </span>
      </h2>
      <ol className="space-y-1">
        {people.map((person, index) => (
          <li
            key={person.worker.id}
            className="flex items-center gap-2 text-sm text-gray-800"
          >
            <span className="w-4 text-xs text-gray-500">{index + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{person.worker.name}</span>
            <span className="text-xs text-gray-500">{person.worker.role}</span>
            <span className="font-medium">{formatMetric(person, metric)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
