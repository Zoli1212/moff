import React from 'react'
import { getAllWorkforceRegistry } from '@/actions/workforce-registry-actions'
import WorkforceRegistryClient from './_components/WorkforceRegistryClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function OthersPage() {
  const workforceRegistry = await getAllWorkforceRegistry()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Munkásregiszter Kezelése
        </h1>
        <p className="text-gray-600">
          A munkásregiszter áttekintése és kezelése - hozzáadás, módosítás, törlés, aktív/inaktív státusz
        </p>
      </div>
      
      <WorkforceRegistryClient workforceRegistry={workforceRegistry} />
    </div>
  )
}