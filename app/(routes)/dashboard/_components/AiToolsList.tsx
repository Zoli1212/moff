import React from 'react'
import AiToolCard from './AiToolCard';


export const aiToolsList = [
    {
        name: 'Ajánlat Chat',
        desc: 'Kérdéseket az ajánlatról',
        icon: '/chatbot.png',
        button: 'Kérdezz most',
        path: '/ai-tools/ai-chat'
    },
    {
        name: 'Igény Elemző',
        desc: 'Elemezd az ügyfél igényeit',
        icon: '/resume.png',
        button: 'Elemzés most',
        path: '/ai-tools/ai-demands-analyzer'
    },
    {
        name: 'Ajánlatlevél Generátor',
        desc: 'Ajánlatlevél szövegből',
        icon: '/cover.png',
        button: 'Létrehozás most',
        path: '/ai-tools/ai-offer-letter'
    },
    {
        name: 'Költség Kalkulátor',
        desc: 'Számold ki az ajánlatodat',
        icon: '/roadmap.png',
        button: 'Számolás most',
        path: '/ai-tools/ai-cost-calculator'
    },
];


function AiToolsList() {
    return (
        <div className='mt-7 p-5 bg-white border rounded-xl'>
            <h2 className='font-bold text-lg'>Elérhető eszközök</h2>
            <p>Kezdd el létrehozni az optimális ajánlatokat ügyfeleidnek ezekkel az exkluzív eszközökkel!</p>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4'>
                {aiToolsList.map((tool, index) => (
                    <AiToolCard tool={tool} key={index} />
                ))}
            </div>
        </div>
    )
}

export default AiToolsList