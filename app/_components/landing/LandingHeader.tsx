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
      {/* Tall enough that the lockup is not wedged against the header's edges. */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        {/*
          The logo is a full lockup — mark above the word "OfferFlow" — so no text label
          sits beside it; that would set the name twice.

          Shown whole rather than cropped. An earlier version scaled it up inside a
          clipping box to swallow the file's wide white margins, which cut the top off
          the arrow — losing part of the mark to gain a little size is a bad trade.
          Instead the box is simply larger and object-contain keeps all of it.

          It is a JPEG with no alpha, so its white ground would show as a pale square
          against the header; mix-blend-multiply drops white on a light background
          without the image needing to be edited.
        */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
          <Image
            src="/offerflow-logo.jpg"
            alt="OfferFlow"
            width={112}
            height={112}
            priority
            className="h-full w-full object-contain mix-blend-multiply"
          />
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
