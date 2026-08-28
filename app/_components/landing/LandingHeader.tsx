"use client";

import Image from "next/image";
import { useLocale } from "@/components/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { ContractorSignIn, CustomerSignIn } from "./SignInActions";

/**
 * Logo on the left, the two ways in on the right.
 *
 * The two entry points are not equals, so they are not styled as equals: the contractor
 * runs the product day to day and gets the solid button, while a customer arrives once
 * to ask for a quote and gets the quieter outline. Making them identical, as the old
 * page did, left the visitor to guess which one was meant for them.
 */
export default function LandingHeader() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="OfferFlow"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">
            OfferFlow
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <CustomerSignIn>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 sm:px-4 sm:text-sm"
            >
              {t("landing.signInCustomer")}
            </button>
          </CustomerSignIn>
          <ContractorSignIn>
            <button
              type="button"
              className="rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md sm:px-4 sm:text-sm"
            >
              {t("landing.signInContractor")}
            </button>
          </ContractorSignIn>
        </div>
      </div>
    </header>
  );
}
