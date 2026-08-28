"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { ContractorSignIn } from "./SignInActions";
import ProductPreview from "./ProductPreview";

/**
 * The first screen: what this is, who it is for, and one thing to do next.
 *
 * A single primary action rather than the old page's two equal buttons. Both ways in
 * remain available in the header, but a visitor who has just arrived should not have to
 * classify themselves before they know what the product does.
 */
export default function LandingHero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden">
      {/* Warm wash behind the fold, kept subtle so text contrast never suffers. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-orange-50 via-stone-50 to-stone-50" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              {t("landing.badge")}
            </span>

            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle")}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              {t("landing.heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ContractorSignIn>
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/25 sm:text-base"
                >
                  {t("landing.heroCta")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </ContractorSignIn>
              <a
                href="#how"
                className="inline-flex items-center rounded-full border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 sm:text-base"
              >
                {t("landing.heroSecondary")}
              </a>
            </div>

            <p className="mt-4 text-xs text-stone-500">{t("landing.heroNote")}</p>
          </div>

          <div className="lg:pl-4">
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
