import { PricingTable } from '@clerk/nextjs'

export default function Billing() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
        <h2 className='font-bold text-3xl text-center'>Choose your plan</h2>
        <p className='text-lg text-center mt-2'>Select a subscription bundle to get all AI Tools Access</p>
        <div className='mt-6'/>
        
      <div className="flex flex-row flex-wrap gap-4 justify-center items-stretch">
        <PricingTable />
      </div>
    </div>
  )
}