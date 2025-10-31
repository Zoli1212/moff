import { SignUp } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default function Page({
  searchParams,
}: {
  searchParams: { invite?: string }
}) {
  // Ha van invite token, átirányítjuk az invite oldalra
  if (searchParams.invite) {
    redirect(`/invite/${searchParams.invite}`)
  }

  return (
    <div className='flex items-center justify-center h-screen'>
      <SignUp />
    </div>
  )
}