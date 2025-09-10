'use client'

import { useEffect } from 'react'
import { getAllUserEmails, checkIsSuperUser } from '@/actions/user-management-actions'
import { useUser } from '@clerk/nextjs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Users } from 'lucide-react'
import { useTenantStore } from '@/store/tenantStore'

export function TenantSelectorSidebar() {
  const { user } = useUser()
  const { 
    selectedTenantEmail, 
    availableTenants, 
    isLoading, 
    setSelectedTenant, 
    setAvailableTenants, 
    setLoading,
    clearSelection 
  } = useTenantStore()

  useEffect(() => {
    const loadTenantData = async () => {
      if (!user) return
      
      setLoading(true)
      
      try {
        // First check if user is super user
        const superUserCheck = await checkIsSuperUser()
        
        if (!superUserCheck.success || !superUserCheck.isSuperUser) {
          setLoading(false)
          return
        }

        // If super user, get all available tenants
        const result = await getAllUserEmails()
        if (result.success && result.users) {
          setAvailableTenants(result.users)
        }
      } catch (error) {
        console.error('Hiba a bérlőválasztó betöltésekor:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenantData()
  }, [user, setLoading, setAvailableTenants])

  const handleTenantChange = (email: string) => {
    setSelectedTenant(email)
  }

  const handleClearSelection = () => {
    clearSelection()
  }

  const getCurrentDisplayValue = () => {
    if (selectedTenantEmail) {
      return selectedTenantEmail
    }
    return undefined
  }

  // Debug logging
  console.log('TenantSelectorSidebar Debug:', {
    isLoading,
    availableTenantsLength: availableTenants.length,
    selectedTenantEmail,
    user: user?.emailAddresses?.[0]?.emailAddress
  })

  if (isLoading) {
    return (
      <div className="w-full px-4 pb-3">
        <div className="bg-[#2c2c2c] border border-[#444] rounded-xl p-3 shadow-lg">
          <div className="text-sm text-[#ffd600]">Bérlők betöltése...</div>
        </div>
      </div>
    )
  }

  if (availableTenants.length === 0) {
    return null
  }

  return (
    <div className="w-full px-4 pb-3">
      <div className="bg-[#2c2c2c] border border-[#444] rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[#ffd600]" />
          <span className="text-sm font-semibold text-[#ffd600]">Bérlő váltása</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={handleTenantChange} value={selectedTenantEmail || undefined}>
            <SelectTrigger className="flex-1 bg-[#444] border-[#555] text-[#ffeb3b] hover:bg-[#555] focus:ring-yellow-500 focus:border-yellow-500">
              <SelectValue placeholder="Válassz bérlőt">
                {getCurrentDisplayValue()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#2c2c2c] border-[#444]">
              {availableTenants.map((tenant) => (
                <SelectItem 
                  key={tenant.id} 
                  value={tenant.email}
                  className="text-[#ffeb3b] hover:bg-[#444] focus:bg-[#555] focus:text-yellow-400"
                >
{tenant.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="p-2 h-8 w-8 bg-[#444] border-[#555] text-[#ffd600] hover:bg-[#555] hover:text-yellow-400"
            title="Bérlő kiválasztás törlése"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedTenantEmail && (
          <div className="mt-2 text-xs text-[#999]">
            Aktív bérlő: {selectedTenantEmail}
          </div>
        )}
      </div>
    </div>
  )
}
