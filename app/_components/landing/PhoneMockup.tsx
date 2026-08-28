"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * A phone frame with the product drawn inside it.
 *
 * The product is used on site, from a phone, so the landing shows it that way rather
 * than as a desktop window. The frame is markup rather than an image: it stays sharp at
 * any resolution, costs no download, and the screen inside can be composed from the same
 * design language the app itself uses.
 */
export default function PhoneMockup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[9/19] w-[248px] shrink-0 rounded-[2.6rem] bg-stone-900 p-[9px] shadow-[0_28px_70px_-18px_rgba(28,25,23,0.5)] sm:w-[276px] ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-white">
        {/* Dynamic island, the detail that makes the frame read as a phone. */}
        <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-stone-900" />
        {children}
      </div>
    </div>
  );
}

/** The app's own bottom bar, so the mock reads as this product and not a generic phone. */
export function PhoneTabBar({ active = "work" }: { active?: "home" | "work" | "diary" }) {
  const { t } = useLocale();

  const tabs = [
    { key: "home", label: t("landing.tabHome") },
    { key: "work", label: t("landing.tabWork") },
    { key: "diary", label: t("landing.tabDiary") },
  ];

  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-stone-100 bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
      {tabs.map((tab) => (
        <div key={tab.key} className="flex flex-col items-center gap-1">
          <div
            className={`h-[3px] w-5 rounded-full ${
              tab.key === active ? "bg-orange-500" : "bg-transparent"
            }`}
          />
          <div
            className={`h-4 w-4 rounded-[5px] ${
              tab.key === active ? "bg-orange-500" : "bg-stone-200"
            }`}
          />
          <span
            className={`text-[7px] font-semibold ${
              tab.key === active ? "text-orange-600" : "text-stone-400"
            }`}
          >
            {tab.label}
          </span>
        </div>
      ))}
    </div>
  );
}
