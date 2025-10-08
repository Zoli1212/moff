import React from 'react'
import { getAllWorkforceRegistry } from '@/actions/workforce-registry-actions'
import WorkforceRegistryClient from './_components/WorkforceRegistryClient'
import BackButton from './_components/BackButton'
import WorkHeader from "@/components/WorkHeader"


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function OthersPage() {
  const workforceRegistry = await getAllWorkforceRegistry()

  return (
    <div className="container mx-auto">
      <WorkHeader title="Munkásregiszter Kezelése" />
      <div className="py-8 px-4">
      <div className="mb-8">
        <p className="text-gray-600">
          A munkásregiszter áttekintése és kezelése - hozzáadás, módosítás, törlés, aktív/inaktív státusz
        </p>
      </div>
      
      <WorkforceRegistryClient workforceRegistry={workforceRegistry} />
      </div>
    </div>
  )
}