"use client";

import React from 'react'
import { useLocale } from "@/components/i18n/LocaleProvider";


const questionList = [
    'Milyen ajánlatokat javasolsz kiküldeni?',
    'Milyen ajánlatok vannak kiküldve?',
    'Mi az optimális költségkalkuláció?',
    'Milyen cégek kértek mostanában ajánlatot?',
    'Milyen nem elküldött ajánlataink vannak?',
]

function EmptyState({ selectedQuestion }: { selectedQuestion: (question: string) => void }) {
  const { t } = useLocale();

    return (
        <div>
            <h2 className='font-bold text-xl text-center'>{t("x.haveAQuestion")}</h2>
            <div>
                {questionList.map((question, index) => (
                    <h2 className='p-4 text-center border rounded-lg my-3 hover:border-primary cursor-pointer'
                        key={index}
                        onClick={() => selectedQuestion(question)}
                    >{question}</h2>
                ))}
            </div>
        </div>
    )
}

export default EmptyState