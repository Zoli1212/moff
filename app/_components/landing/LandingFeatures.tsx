"use client";

import { CalendarCheck, Receipt, Sparkles } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * What the product does, and the order it happens in.
 *
 * Three capabilities rather than a longer list: the page has to say enough to be
 * credible without turning into documentation. The steps below repeat the same story as
 * a sequence, because a contractor deciding whether to try this wants to know where the
 * work starts, not only what features exist.
 */
export default function LandingFeatures() {
  const { t } = useLocale();

  const capabilities = [
    {
      icon: Sparkles,
      title: t("landing.cap1Title"),
      body: t("landing.cap1Body"),
    },
    {
      icon: CalendarCheck,
      title: t("landing.cap2Title"),
      body: t("landing.cap2Body"),
    },
    {
      icon: Receipt,
      title: t("landing.cap3Title"),
      body: t("landing.cap3Body"),
    },
  ];

  const steps = [
    { n: "1", title: t("landing.step1Title"), body: t("landing.step1Body") },
    { n: "2", title: t("landing.step2Title"), body: t("landing.step2Body") },
    { n: "3", title: t("landing.step3Title"), body: t("landing.step3Body") },
  ];

  return (
    <>
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-t border-stone-200 bg-stone-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {t("landing.howTitle")}
          </h2>
          <p className="mt-3 max-w-xl text-base text-stone-600">{t("landing.howSubtitle")}</p>

          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.n}
                className="relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 text-base font-bold text-stone-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
