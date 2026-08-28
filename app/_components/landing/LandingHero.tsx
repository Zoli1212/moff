"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { ContractorSignIn } from "./SignInActions";
import PhoneMockup from "./PhoneMockup";
import { WorkScreen } from "./PhoneScreens";
import { displaySerif } from "./fonts";

/**
 * The first screen: what this is, and one thing to do next.
 *
 * Centred on the phone, because the product is used on site rather than at a desk. The
 * cards floating around it are the numbers a contractor actually cares about, pulled out
 * of the screen so they read at a glance instead of needing the visitor to squint at the
 * mock.
 */
export default function LandingHero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden">
      {/* Warm wash, kept low-contrast so the headline never fights the background. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-orange-100/70 via-orange-50/40 to-stone-50" />

      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
        <span className="inline-flex items-center rounded-full border border-orange-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold text-orange-700 backdrop-blur sm:text-xs">
          {t("landing.badge")}
        </span>

        <h1
          className={`${displaySerif.className} mx-auto mt-6 max-w-3xl text-[2.6rem] leading-[1.06] tracking-[-0.015em] text-stone-900 sm:text-6xl lg:text-7xl`}
        >
          {t("landing.heroTitle")}
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-stone-600 sm:text-lg">
          {t("landing.heroSubtitle")}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <ContractorSignIn>
            <button
              type="button"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 sm:w-auto"
            >
              {t("landing.heroCta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </ContractorSignIn>
          <a
            href="#how"
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-3.5 text-[15px] font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 sm:w-auto"
          >
            {t("landing.heroSecondary")}
          </a>
        </div>

        <p className="mt-4 text-xs text-stone-500">{t("landing.heroNote")}</p>

        {/* The phone, with the pulled-out figures around it. */}
        <div className="relative mt-14 flex justify-center sm:mt-16">
          <div className="relative">
            <PhoneMockup>
              <WorkScreen />
            </PhoneMockup>

            {/* Hidden below sm: on a narrow screen they would crowd the phone. */}
            <div className="absolute -left-32 top-16 hidden w-36 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("landing.floatQuoteLabel")}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-stone-900">2 {t("landing.floatMinutes")}</p>
              <p className="mt-0.5 text-[10px] text-stone-500">{t("landing.floatQuoteNote")}</p>
            </div>

            <div className="absolute -right-32 top-40 hidden w-36 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("landing.floatDiaryLabel")}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-stone-900">3 {t("landing.diaryPeople")}</p>
              <div className="mt-1.5 flex -space-x-1.5">
                {["bg-orange-400", "bg-stone-800", "bg-amber-500"].map((tone) => (
                  <span key={tone} className={`h-5 w-5 rounded-full border-2 border-white ${tone}`} />
                ))}
              </div>
            </div>

            <div className="absolute -left-28 bottom-20 hidden w-36 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("landing.floatPayrollLabel")}
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight text-stone-900">1 240 000</p>
              <p className="mt-0.5 text-[10px] text-stone-500">{t("landing.floatPayrollNote")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
