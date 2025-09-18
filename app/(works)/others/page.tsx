import React from 'react'
import { getAllWorkersAcrossTenants } from '@/actions/get-all-workers-across-tenants'
import WorkersListClient from './_components/WorkersListClient'

export default async function OthersPage() {
  const workers = await getAllWorkersAcrossTenants()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Munkások Kezelése
        </h1>
        <p className="text-gray-600">
          Az összes tenant munkásainak áttekintése és kezelése
        </p>
      </div>
      
      <WorkersListClient workers={workers} />
    </div>
  )
}