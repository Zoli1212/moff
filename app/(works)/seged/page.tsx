import React from 'react'
import AidClient from './_components/AidClient'
import WorkHeader from "@/components/WorkHeader"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function SegedPage() {
  return (
    <div className="container mx-auto">
      <WorkHeader title="Egyéb menü" />
      <div className="py-8 px-4">
        <div className="mb-8">
          <p className="text-gray-600">
            Segedeszkozok es kiegeszito funkciok a munkak kezelesehez
          </p>
        </div>
        
        <AidClient />
      </div>
    </div>
  )
}
