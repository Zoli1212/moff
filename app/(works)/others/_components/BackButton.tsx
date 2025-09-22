'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <button onClick={handleBack} className="p-2">
      <ArrowLeft className="h-6 w-6 text-gray-600" />
    </button>
  )
}
