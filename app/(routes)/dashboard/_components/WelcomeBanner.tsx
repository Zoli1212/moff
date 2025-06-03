import React from 'react'

type Props = {}

function WelcomeBanner({}: Props) {
  return (
    <div className='p-5 bg-gradient-to-tr from-[#BE575F] via-[#A338E3] to-[#AC76D6] '>

        <h3 className='font-bold text-2xl'>AI Personal Assistant</h3>
        <p>Smarter business decisions start here — get tailored advice, real-time market insights, and a roadmap built just for you with the power of AI.</p>
        <button className='bg-white text-black px-4 py-2 rounded-md'>Get Started</button>
    </div>
  )
}

export default WelcomeBanner