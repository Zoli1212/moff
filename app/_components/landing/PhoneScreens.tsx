"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { PhoneTabBar } from "./PhoneMockup";

/**
 * The screens shown inside the phone frames.
 *
 * Composed from the same shapes the product uses — a work with priced items and a
 * progress bar, a day in the site diary, and the performance the diary adds up to — so
 * the landing shows what is actually being sold rather than a generic dashboard. The
 * figures are illustrative.
 */

/** Work detail: what a contractor opens most often. */
export function WorkScreen() {
  const { t } = useLocale();

  const items = [
    { name: t("landing.previewItem1"), value: "1 240 000", done: true },
    { name: t("landing.previewItem2"), value: "486 000", done: true },
    { name: t("landing.previewItem3"), value: "312 500", done: false },
  ];

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-4 pb-3">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-400">
          {t("landing.screenWorkLabel")}
        </p>
        <p className="mt-0.5 text-[13px] font-bold leading-tight text-stone-900">
          {t("landing.previewProject")}
        </p>
      </div>

      <div className="mx-4 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] font-semibold text-stone-500">
            {t("landing.previewProgress")}
          </span>
          <span className="text-[13px] font-bold text-stone-900">62%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full w-[62%] rounded-full bg-orange-500" />
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-hidden px-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm"
          >
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                item.done ? "bg-emerald-500" : "border-2 border-stone-200"
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-stone-700">
              {item.name}
            </span>
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-stone-900">
              {item.value}
            </span>
          </div>
        ))}

        <div className="!mt-3 flex items-center justify-between rounded-lg bg-stone-900 px-2.5 py-2">
          <span className="text-[9px] font-semibold text-stone-300">
            {t("landing.previewTotal")}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white">2 038 500 Ft</span>
        </div>
      </div>

      <PhoneTabBar active="work" />
    </div>
  );
}

/**
 * What the diary adds up to.
 *
 * The point of logging every day is not the log — it is that the week's performance,
 * each worker's hours and whether the job is actually making money all fall out of it
 * without anyone assembling a spreadsheet.
 */
export function PerformanceScreen() {
  const { t } = useLocale();

  const workers = [
    { name: "Kiss P.", hours: 38, width: "w-[95%]" },
    { name: "Nagy A.", hours: 32, width: "w-[80%]" },
    { name: "Tóth B.", hours: 24, width: "w-[60%]" },
  ];

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-3 pb-2">
        <p className="text-[11px] font-bold text-stone-900">{t("landing.screenPerfLabel")}</p>
      </div>

      <div className="mx-3 rounded-xl bg-white p-2.5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-[8px] font-semibold uppercase tracking-wide text-stone-400">
            {t("landing.perfWeek")}
          </span>
          {/* The comparison is the part that makes a number mean something. */}
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
            +12%
          </span>
        </div>
        <p className="mt-0.5 text-lg font-bold leading-none text-stone-900">104%</p>
      </div>

      <div className="mx-3 mt-2 flex-1 rounded-xl bg-white p-2.5 shadow-sm">
        <p className="text-[8px] font-semibold uppercase tracking-wide text-stone-400">
          {t("landing.perfHours")}
        </p>
        <div className="mt-2 space-y-1.5">
          {workers.map((worker) => (
            <div key={worker.name} className="flex items-center gap-1.5">
              <span className="w-11 shrink-0 truncate text-[8px] text-stone-600">{worker.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div className={`h-full rounded-full bg-orange-500 ${worker.width}`} />
              </div>
              <span className="w-5 shrink-0 text-right text-[8px] font-bold tabular-nums text-stone-800">
                {worker.hours}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue, cost and what is left: the question behind the whole diary. */}
      <div className="mx-3 mb-14 mt-2 grid grid-cols-3 gap-1">
        <div className="rounded-lg bg-white p-1.5 text-center shadow-sm">
          <p className="text-[6px] font-semibold uppercase text-stone-400">
            {t("landing.perfRevenue")}
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-stone-800">2,0 M</p>
        </div>
        <div className="rounded-lg bg-white p-1.5 text-center shadow-sm">
          <p className="text-[6px] font-semibold uppercase text-stone-400">
            {t("landing.perfCost")}
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-stone-800">1,4 M</p>
        </div>
        <div className="rounded-lg bg-stone-900 p-1.5 text-center shadow-sm">
          <p className="text-[6px] font-semibold uppercase text-stone-400">
            {t("landing.perfProfit")}
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-orange-400">31%</p>
        </div>
      </div>

      <PhoneTabBar active="work" />
    </div>
  );
}

/** A day in the site diary, the record the whole build is judged on. */
export function DiaryScreen() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-4 pb-2">
        <p className="text-[11px] font-bold text-stone-900">{t("landing.screenDiaryLabel")}</p>
        <p className="text-[8px] text-stone-500">2026-08-20</p>
      </div>

      <div className="flex-1 space-y-1.5 px-3">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryWeather")}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold text-stone-800">24,5 °C</p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryHeadcount")}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold text-stone-800">
            3 {t("landing.diaryPeople")}
          </p>
          <div className="mt-1.5 flex -space-x-1">
            {["bg-orange-400", "bg-stone-700", "bg-amber-500"].map((tone) => (
              <span
                key={tone}
                className={`h-3.5 w-3.5 rounded-full border border-white ${tone}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryOutput")}
          </p>
          <p className="mt-0.5 text-[8px] leading-snug text-stone-700">
            {t("landing.diaryOutputText")}
          </p>
        </div>
      </div>

      <PhoneTabBar active="diary" />
    </div>
  );
}
