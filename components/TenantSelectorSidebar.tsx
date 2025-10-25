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

  if (isLoading) {
    return (
      <div className="w-full px-4 pb-3">
        <div className="bg-gray-50 border border-[#FF7700] rounded-xl p-3 shadow-lg">
          <div className="text-sm text-[#FF7700]">Bérlők betöltése...</div>
        </div>
      </div>
    )
  }

  if (availableTenants.length === 0) {
    return null
  }

  return (
    <div className="w-full px-4 pb-3">
      <div className="bg-gray-50 border border-[#FF7700] rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[#FF7700]" />
          <span className="text-sm font-semibold text-[#FF7700]">Bérlő váltása</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={handleTenantChange} value={selectedTenantEmail || undefined}>
            <SelectTrigger className="flex-1 bg-white border-[#FF7700] text-[#FF7700] hover:bg-gray-100 focus:ring-orange-500 focus:border-orange-500">
              <SelectValue placeholder="Válassz bérlőt">
                {getCurrentDisplayValue()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border-[#FF7700]">
              {availableTenants.map((tenant) => (
                <SelectItem 
                  key={tenant.id} 
                  value={tenant.email}
                  className="text-[#FF7700] hover:bg-gray-100 focus:bg-gray-200 focus:text-orange-600"
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
            className="p-2 h-8 w-8 bg-white border-[#FF7700] text-[#FF7700] hover:bg-gray-100 hover:text-orange-600"
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
