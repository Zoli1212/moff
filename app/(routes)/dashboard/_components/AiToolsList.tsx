"use client";

// The tool titles come from the client-side locale context, which a server
// component cannot read. This is a presentational list, so making it a client
// island is cheaper than making the whole page dynamic to read the cookie.
import React from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import AiToolCard from "./AiToolCard";
import type { Translator } from "@/lib/i18n/messages";

/**
 * Built with the translator rather than frozen at import time: these are the card
 * titles and buttons a user reads.
 */
export const buildAiToolsList = (t: Translator) => [
  {
    name: t("ai.offerChat"),
    desc: t("ai.offerChatHint"),
    icon: "/chatbot.png",
    button: t("ai.askNow"),
    path: "/ai-tools/ai-chat",
  },
  {
    name: t("ai.demandAnalyser"),
    desc: t("ai.demandHint"),
    icon: "/resume.png",
    button: t("ai.analyseNow"),
    path: "/ai-tools/ai-demands-analyzer",
  },
  {
    name: t("ai.letterGenerator"),
    desc: t("ai.letterFromText"),
    icon: "/cover.png",
    button: t("ai.createNow"),
    path: "/ai-tools/ai-offer-letter",
  },
  {
    name: t("ai.unpricedOffer"),
    desc: t("ai.prewrittenItems"),
    icon: "/roadmap.png",
    button: t("ai.calculateNow"),
    path: "/ai-tools/ai-cost-calculator",
 },
];

function AiToolsList() {
  const { t } = useLocale();
  const aiToolsList = buildAiToolsList(t);

  return (
    <div className="mt-7 p-5 bg-white border rounded-xl">
      <h2 className="font-bold text-lg">{t("ai.available")}</h2>
      <p>
        Kezdd el létrehozni az optimális ajánlatokat ügyfeleidnek ezekkel az
        exkluzív eszközökkel!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4">
        {aiToolsList.map((tool, index) => (
          <AiToolCard tool={tool} key={index} />
        ))}
      </div>
    </div>
  );
}

export default AiToolsList;
