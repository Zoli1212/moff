"use client";

import { CalendarCheck, Check, Receipt, Sparkles } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import PhoneMockup from "./PhoneMockup";
import { BoardScreen, DiaryScreen } from "./PhoneScreens";
import { displayFont } from "./fonts";

/**
 * What the product does, shown on the device it is used on.
 *
 * Three capabilities first, because a visitor deciding whether to read on wants the
 * shape of the thing quickly. Then two showcases with a phone each, alternating sides so
 * the eye keeps moving. The steps close the section by putting the same story in order.
 */
export default function LandingFeatures() {
  const { t } = useLocale();

  const capabilities = [
    { icon: Sparkles, title: t("landing.cap1Title"), body: t("landing.cap1Body") },
    { icon: CalendarCheck, title: t("landing.cap2Title"), body: t("landing.cap2Body") },
    { icon: Receipt, title: t("landing.cap3Title"), body: t("landing.cap3Body") },
  ];

  const steps = [
    { n: "1", title: t("landing.step1Title"), body: t("landing.step1Body") },
    { n: "2", title: t("landing.step2Title"), body: t("landing.step2Body") },
    { n: "3", title: t("landing.step3Title"), body: t("landing.step3Body") },
  ];

  return (
    <>
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
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

      <Showcase
        eyebrow={t("landing.showBoardEyebrow")}
        title={t("landing.showBoardTitle")}
        body={t("landing.showBoardBody")}
        points={[t("landing.showBoardP1"), t("landing.showBoardP2"), t("landing.showBoardP3")]}
        phone={<BoardScreen />}
      />

      <Showcase
        reversed
        tone="dark"
        eyebrow={t("landing.showDiaryEyebrow")}
        title={t("landing.showDiaryTitle")}
        body={t("landing.showDiaryBody")}
        points={[t("landing.showDiaryP1"), t("landing.showDiaryP2"), t("landing.showDiaryP3")]}
        phone={<DiaryScreen />}
      />

      <section id="how" className="scroll-mt-20 border-t border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h2
            className={`${displayFont.className} max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-stone-900 sm:text-5xl`}
          >
            {t("landing.howTitle")}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-stone-600">{t("landing.howSubtitle")}</p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {steps.map((step) => (
              <li key={step.n} className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
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

/** One feature block: words on one side, the phone on the other. */
function Showcase({
  eyebrow,
  title,
  body,
  points,
  phone,
  reversed = false,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  phone: React.ReactNode;
  reversed?: boolean;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <section
      className={`border-t ${isDark ? "border-stone-900 bg-stone-900" : "border-stone-200 bg-stone-50"}`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={reversed ? "lg:order-2" : ""}>
            <span
              className={`text-xs font-bold uppercase tracking-[0.12em] ${
                isDark ? "text-orange-400" : "text-orange-600"
              }`}
            >
              {eyebrow}
            </span>
            <h2
              className={`${displayFont.className} mt-3 text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl ${
                isDark ? "text-white" : "text-stone-900"
              }`}
            >
              {title}
            </h2>
            <p
              className={`mt-4 max-w-lg text-[15px] leading-relaxed ${
                isDark ? "text-stone-300" : "text-stone-600"
              }`}
            >
              {body}
            </p>
            <ul className="mt-6 space-y-2.5">
              {points.map((point) => (
                <li
                  key={point}
                  className={`flex items-start gap-2.5 text-sm ${
                    isDark ? "text-stone-200" : "text-stone-700"
                  }`}
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isDark ? "text-orange-400" : "text-orange-500"
                    }`}
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className={`flex justify-center ${reversed ? "lg:order-1" : ""}`}>
            <PhoneMockup>{phone}</PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
}
