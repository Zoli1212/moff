import React from 'react'
import AiToolsList from '../dashboard/_components/AiToolsList'
import WelcomeBanner from '../dashboard/_components/WelcomeBanner'
function AiTools() {
    return (
        <div>
            <WelcomeBanner />
            <h2 className='font-bold text-2xl mt-5'>Személyi Asszisztens</h2>
            <p className='text-lg mt-2'>Kezdjük el a csevegést</p>
            <AiToolsList />
        </div>
    )
}

export default AiTools