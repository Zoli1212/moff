'use client'

import { useEffect } from 'react'
import { useTenantStore } from '@/store/tenantStore'

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { selectedTenantEmail } = useTenantStore()

  useEffect(() => {
    // Set tenant header for server actions
    if (selectedTenantEmail) {
      // Store in a way that server actions can access
      document.cookie = `selected-tenant=${selectedTenantEmail}; path=/`
    } else {
      // Clear cookie if no tenant selected
      document.cookie = 'selected-tenant=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }, [selectedTenantEmail])

  return <>{children}</>
}
