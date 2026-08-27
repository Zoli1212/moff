"use client";

import React from 'react'
import { useLocale } from "@/components/i18n/LocaleProvider";
import AiToolsList from '../dashboard/_components/AiToolsList'
import WelcomeBanner from '../dashboard/_components/WelcomeBanner'
function AiTools() {
  const { t } = useLocale();

    return (
        <div>
            <WelcomeBanner />
            <h2 className='font-bold text-2xl mt-5'>{t("x.assistant")}</h2>
            <p className='text-lg mt-2'>{t("x.startChat")}</p>
            <AiToolsList />
        </div>
    )
}

export default AiTools