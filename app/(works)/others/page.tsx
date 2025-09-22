import React from 'react'
import { getAllWorkforceRegistry } from '@/actions/workforce-registry-actions'
import WorkforceRegistryClient from './_components/WorkforceRegistryClient'
import BackButton from './_components/BackButton'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function OthersPage() {
  const workforceRegistry = await getAllWorkforceRegistry()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        {/* Back button and title */}
        <div className="flex items-center mb-2">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900 ml-2">
            Munkásregiszter Kezelése
          </h1>
        </div>
        <p className="text-gray-600">
          A munkásregiszter áttekintése és kezelése - hozzáadás, módosítás, törlés, aktív/inaktív státusz
        </p>
      </div>
      
      <WorkforceRegistryClient workforceRegistry={workforceRegistry} />
    </div>
  )
}