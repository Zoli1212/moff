"use client";

import { ArrowRight, Check } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { displaySerif } from "./fonts";
import { ContractorSignIn, CustomerSignIn } from "./SignInActions";

/**
 * The two entry points, explained.
 *
 * The old page put two identically styled buttons in the middle of a photograph and left
 * the visitor to work out which applied to them. Here each audience gets its own panel
 * saying what it gets and where the button leads, so the choice is informed by the time
 * it is made. The buttons remain the same two Clerk flows as in the header.
 */
export default function LandingAudiences() {
  const { t } = useLocale();

  const contractorPoints = [
    t("landing.forContractorP1"),
    t("landing.forContractorP2"),
    t("landing.forContractorP3"),
  ];
  const customerPoints = [
    t("landing.forCustomerP1"),
    t("landing.forCustomerP2"),
    t("landing.forCustomerP3"),
  ];

  return (
    <>
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* The contractor is the primary audience, so this panel carries the weight. */}
            <div className="rounded-2xl border border-stone-900 bg-stone-900 p-6 text-white sm:p-8">
              <h3 className={`${displaySerif.className} text-3xl leading-tight tracking-tight sm:text-4xl`}>
                {t("landing.forContractorTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-300">
                {t("landing.forContractorBody")}
              </p>
              <ul className="mt-5 space-y-2.5">
                {contractorPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-stone-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                    {point}
                  </li>
                ))}
              </ul>
              <ContractorSignIn>
                <button
                  type="button"
                  className="group mt-7 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600"
                >
                  {t("landing.signInContractor")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </ContractorSignIn>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8">
              <h3 className={`${displaySerif.className} text-3xl leading-tight tracking-tight text-stone-900 sm:text-4xl`}>
                {t("landing.forCustomerTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {t("landing.forCustomerBody")}
              </p>
              <ul className="mt-5 space-y-2.5">
                {customerPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-stone-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    {point}
                  </li>
                ))}
              </ul>
              <CustomerSignIn>
                <button
                  type="button"
                  className="group mt-7 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100"
                >
                  {t("landing.signInCustomer")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </CustomerSignIn>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className={`${displaySerif.className} text-4xl leading-[1.1] tracking-[-0.01em] text-stone-900 sm:text-5xl`}>
            {t("landing.ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-stone-600">
            {t("landing.ctaBody")}
          </p>
          <div className="mt-8 flex justify-center">
            <ContractorSignIn>
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-xl"
              >
                {t("landing.heroCta")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </ContractorSignIn>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:px-6">
          <span className="font-semibold text-stone-700">OfferFlow</span>
          <span>{t("landing.footerNote")}</span>
        </div>
      </footer>
    </>
  );
}
