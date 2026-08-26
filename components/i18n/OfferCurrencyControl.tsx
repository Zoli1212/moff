"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setOfferCurrency } from "@/actions/offer-currency-actions";
import {
  CURRENCIES,
  convertFromHuf,
  formatMoney,
  resolveCurrency,
  type Currency,
} from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

/**
 * Switches the currency an offer is quoted in.
 *
 * The converted total is previewed live while the rate is being typed. A mistyped rate -
 * 4 instead of 400 - is the easiest error to make here and the hardest to notice
 * afterwards, so it is made visible before saving rather than validated against an
 * arbitrary range that would eventually reject a legitimate value.
 */
export default function OfferCurrencyControl({
  offerId,
  currency,
  exchangeRate,
  totalPriceHuf,
}: {
  offerId: number;
  currency: string;
  exchangeRate: number | null;
  totalPriceHuf: number;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draftCurrency, setDraftCurrency] = useState<Currency>(
    resolveCurrency(currency)
  );
  const [draftRate, setDraftRate] = useState(
    exchangeRate != null ? String(exchangeRate) : ""
  );

  const parsedRate = Number(draftRate.replace(",", "."));
  const rateValid = Number.isFinite(parsedRate) && parsedRate > 0;

  const preview =
    draftCurrency === "HUF"
      ? formatMoney(totalPriceHuf, "HUF", locale)
      : rateValid
        ? formatMoney(
            convertFromHuf(totalPriceHuf, "EUR", parsedRate),
            "EUR",
            locale
          )
        : "–";

  const dirty =
    draftCurrency !== resolveCurrency(currency) ||
    (draftCurrency === "EUR" && parsedRate !== exchangeRate);

  const save = () => {
    startTransition(async () => {
      const result = await setOfferCurrency(
        offerId,
        draftCurrency,
        draftCurrency === "EUR" ? parsedRate : null
      );
      if (!result.success) {
        toast.error(result.error ?? "A mentés nem sikerült.");
        return;
      }
      toast.success(t("common.save"));
      router.refresh();
    });
  };

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-600">
          <span className="mb-1 block font-medium">
            {t("offers.currency.label")}
          </span>
          <select
            value={draftCurrency}
            onChange={(event) =>
              setDraftCurrency(event.target.value as Currency)
            }
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {CURRENCIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {draftCurrency === "EUR" && (
          <label className="text-xs text-gray-600">
            <span className="mb-1 block font-medium">
              {t("offers.currency.rate")}
            </span>
            <input
              inputMode="decimal"
              value={draftRate}
              onChange={(event) => setDraftRate(event.target.value)}
              placeholder="pl. 395"
              className={`w-28 rounded-md border bg-white px-2 py-1.5 text-sm ${
                draftRate && !rateValid ? "border-red-400" : "border-gray-300"
              }`}
            />
          </label>
        )}

        <div className="text-xs text-gray-600">
          <span className="mb-1 block font-medium">
            {t("offers.totalPrice")}
          </span>
          <span className="text-base font-semibold text-gray-900">
            {preview}
          </span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={isPending || !dirty || (draftCurrency === "EUR" && !rateValid)}
          className="rounded-md bg-[#FE9C00] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#FE9C00]/90 disabled:opacity-50"
        >
          {isPending ? t("common.saving") : t("common.save")}
        </button>
      </div>

      {draftCurrency === "EUR" && (
        <p className="mt-2 text-[11px] text-gray-500">
          {t("offers.currency.rateHint")}
        </p>
      )}
    </div>
  );
}
