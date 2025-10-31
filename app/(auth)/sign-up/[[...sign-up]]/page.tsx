import { SignUp } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const params = await searchParams;
  // Ha van invite token, átirányítjuk az invite oldalra
  if (params.invite) {
    redirect(`/invite/${params.invite}`)
  }

  return (
    <div className='flex items-center justify-center h-screen'>
      <SignUp />
    </div>
  )
}