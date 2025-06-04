import React from 'react'

type Props = {}

function WelcomeBanner({}: Props) {
  return (
    <div className='p-5 bg-gradient-to-tr from-[#BE575F] via-[#A338E3] to-[#AC76D6] '>

        <h3 className='font-bold text-2xl'>Személyi asszisztens</h3>
        <p>Az okosabb üzleti döntések itt kezdődnek – személyre szabott tanácsadás, valós idejű piaci betekintés és egyedi ütemterv csak Neked!</p>
        <button className='bg-white text-black px-4 py-2 rounded-md'>Kezdd el</button>
    </div>
  )
}

export default WelcomeBanner