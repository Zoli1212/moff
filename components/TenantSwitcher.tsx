'use client'

import { useEffect } from 'react'
import { getAllUserEmails, checkIsSuperUser } from '@/actions/user-management-actions'
import { useUser } from '@clerk/nextjs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useTenantStore } from '@/store/tenantStore'

export function TenantSwitcher() {
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
        console.error('Hiba a bérlőváltó betöltésekor:', error)
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
      const tenant = availableTenants.find(t => t.email === selectedTenantEmail)
      return tenant?.name || tenant?.email || selectedTenantEmail
    }
    return undefined
  }

  if (isLoading || availableTenants.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-50 border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Bérlő váltása:</span>
        <Select onValueChange={handleTenantChange} value={selectedTenantEmail || undefined}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Válassz bérlőt">
              {getCurrentDisplayValue()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableTenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.email}>
                {tenant.name || tenant.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTenantEmail && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="p-2 h-8 w-8"
            title="Bérlő kiválasztás törlése"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
