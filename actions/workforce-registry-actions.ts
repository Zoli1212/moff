'use server'

import { prisma } from '@/lib/prisma'
import { getTenantSafeAuth } from '@/lib/tenant-auth'
import { revalidatePath } from 'next/cache'

export interface WorkforceRegistryData {
  id?: number
  name: string
  role: string
  email: string | null
  phone: string | null
  contactInfo: string | null
  hiredDate: Date | null
  leftDate: Date | null
  isActive: boolean
  notes: string | null
  avatarUrl: string | null
  dailyRate: number | null
}

// Get all workforce registry entries for current tenant
export async function getAllWorkforceRegistry() {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    const workforceEntries = await prisma.workforceRegistry.findMany({
      where: {
        tenantEmail: tenantEmail
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    return workforceEntries
  } catch (error) {
    console.error('Error fetching workforce registry:', error)
    throw new Error('Hiba a munkásregiszter lekérése során')
  }
}

// Create new workforce registry entry
export async function createWorkforceRegistry(data: Omit<WorkforceRegistryData, 'id'>) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    const newEntry = await prisma.workforceRegistry.create({
      data: {
        ...data,
        tenantEmail: tenantEmail
      }
    })

    revalidatePath('/others')
    return { success: true, data: newEntry }
  } catch (error) {
    console.error('Error creating workforce registry entry:', error)
    return { success: false, error: 'Hiba a munkás hozzáadása során' }
  }
}

// Update workforce registry entry
export async function updateWorkforceRegistry(id: number, data: Partial<WorkforceRegistryData>) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    // Verify ownership
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail
      }
    })

    if (!existingEntry) {
      return { success: false, error: 'Munkás nem található vagy nincs jogosultság' }
    }

    const updatedEntry = await prisma.workforceRegistry.update({
      where: { id: id },
      data: data
    })

    revalidatePath('/others')
    return { success: true, data: updatedEntry }
  } catch (error) {
    console.error('Error updating workforce registry entry:', error)
    return { success: false, error: 'Hiba a munkás frissítése során' }
  }
}

// Delete workforce registry entry
export async function deleteWorkforceRegistry(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    // Verify ownership
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail
      }
    })

    if (!existingEntry) {
      return { success: false, error: 'Munkás nem található vagy nincs jogosultság' }
    }

    await prisma.workforceRegistry.delete({
      where: { id: id }
    })

    revalidatePath('/others')
    return { success: true }
  } catch (error) {
    console.error('Error deleting workforce registry entry:', error)
    return { success: false, error: 'Hiba a munkás törlése során' }
  }
}

// Toggle active status
export async function toggleWorkforceRegistryActive(id: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth()

    // Get current entry
    const existingEntry = await prisma.workforceRegistry.findFirst({
      where: {
        id: id,
        tenantEmail: tenantEmail
      }
    })

    if (!existingEntry) {
      return { success: false, error: 'Munkás nem található vagy nincs jogosultság' }
    }

    const updatedEntry = await prisma.workforceRegistry.update({
      where: { id: id },
      data: {
        isActive: !existingEntry.isActive
      }
    })

    revalidatePath('/others')
    return { success: true, data: updatedEntry }
  } catch (error) {
    console.error('Error toggling workforce registry active status:', error)
    return { success: false, error: 'Hiba az aktív státusz módosítása során' }
  }
}

