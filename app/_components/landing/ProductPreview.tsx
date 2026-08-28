"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * The hero visual, built from markup rather than a screenshot.
 *
 * There is no product screenshot in the repository, and a fabricated image pretending to
 * be one would be both dishonest and blurry on a dense display. Drawing it in the
 * product's own design language stays sharp at any resolution, costs no image download,
 * and can be swapped for a real capture later without touching the layout around it.
 *
 * The figures are illustrative and say so through their generic wording; nothing here
 * claims to be a real project.
 */
export default function ProductPreview() {
  const { t } = useLocale();

  const rows = [
    { name: t("landing.previewItem1"), value: "1 240 000 Ft" },
    { name: t("landing.previewItem2"), value: "486 000 Ft" },
    { name: t("landing.previewItem3"), value: "312 500 Ft" },
  ];

  return (
    <div className="relative select-none" aria-hidden>
      {/* Soft glow, so the card reads as lifted rather than pasted on. */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-orange-200/50 via-amber-100/40 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_50px_-12px_rgba(28,25,23,0.22)]">
        <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="ml-2 truncate text-xs font-medium text-stone-500">
            {t("landing.previewTitle")}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-900">
                {t("landing.previewProject")}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{t("landing.previewMeta")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              {t("landing.previewStatus")}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"
              >
                <span className="truncate text-xs text-stone-600">{row.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-800">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
            <span className="text-xs font-medium text-stone-500">
              {t("landing.previewTotal")}
            </span>
            <span className="text-base font-bold tabular-nums text-stone-900">2 038 500 Ft</span>
          </div>
        </div>
      </div>

      {/* Progress chip, overlapping the corner so the composition has depth. */}
      <div className="absolute -bottom-5 -left-4 hidden w-44 rounded-xl border border-stone-200 bg-white p-3 shadow-lg sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          {t("landing.previewProgress")}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full w-[62%] rounded-full bg-orange-500" />
        </div>
        <p className="mt-1.5 text-xs font-bold text-stone-800">62%</p>
      </div>
    </div>
  );
}
