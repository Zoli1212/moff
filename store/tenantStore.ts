'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TenantUser {
  id: number
  email: string
  name: string
}

interface TenantStore {
  selectedTenantEmail: string | null
  availableTenants: TenantUser[]
  isLoading: boolean
  setSelectedTenant: (email: string) => void
  setAvailableTenants: (tenants: TenantUser[]) => void
  setLoading: (loading: boolean) => void
  clearSelection: () => void
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      selectedTenantEmail: null,
      availableTenants: [],
      isLoading: false,
      setSelectedTenant: (email: string) => 
        set({ selectedTenantEmail: email }),
      setAvailableTenants: (tenants: TenantUser[]) => 
        set({ availableTenants: tenants }),
      setLoading: (loading: boolean) => 
        set({ isLoading: loading }),
      clearSelection: () => {
        set({ selectedTenantEmail: null })
        // Force localStorage removal
        localStorage.removeItem('tenant-storage')
      },
    }),
    {
      name: 'tenant-storage',
      partialize: (state) => ({ 
        selectedTenantEmail: state.selectedTenantEmail 
      }),
    }
  )
)
