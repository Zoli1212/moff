import React from 'react'
import AiToolCard from './AiToolCard';


export const aiToolsList = [
    {
        name: 'AI Offer Chat',
        desc: 'Ask offer questions',
        icon: '/chatbot.png',
        button: 'Ask Now',
        path: '/ai-tools/ai-offer'
    },
    {
        name: 'AI Demands Analyzer',
        desc: 'Analyze customer demands',
        icon: '/resume.png',
        button: 'Analyze Now',
        path: '/ai-tools/ai-demands-analyzer'
    },
    {
        name: 'AI Cost Calculator',
        desc: 'Calculate your offer',
        icon: '/roadmap.png',
        button: 'Calculate Now',
        path: '/ai-tools/ai-cost-calculator'
    },
    {
        name: 'AI Offer Letter Generator',
        desc: 'Generate your offer letter',
        icon: '/cover.png',
        button: 'Create Now',
        path: '/ai-tools/ai-offer-letter-generator'
    },
];


function AiToolsList() {
    return (
        <div className='mt-7 p-5 bg-white border rounded-xl'>
            <h2 className='font-bold text-lg'>Available AI Tools</h2>
            <p>Start creating optimale offers for your customers with this exclusive AI Tools</p>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4'>
                {aiToolsList.map((tool, index) => (
                    <AiToolCard tool={tool} key={index} />
                ))}
            </div>
        </div>
    )
}

export default AiToolsList