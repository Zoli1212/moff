'use server'

import { prisma } from '@/lib/prisma'
import { getTenantSafeAuth } from '@/lib/tenant-auth'

/**
 * Aktuális fizetés lekérése egy adott dátumra
 * @param workforceRegistryId - Munkás ID
 * @param date - Dátum, amire a fizetést keressük
 * @returns A dátumra érvényes napi fizetés
 */
export async function getCurrentSalary(workforceRegistryId: number, date: Date = new Date()): Promise<number> {
  try {
    const { tenantEmail } = await getTenantSafeAuth()

    // Keressük meg a legutolsó fizetési rekordot, ami <= a megadott dátumnál
    const salaryRecord = await prisma.workforceRegistrySalaryHistory.findFirst({
      where: {
        workforceRegistryId,
        tenantEmail,
        validFrom: { lte: date }
      },
      orderBy: { validFrom: 'desc' }
    })

    if (salaryRecord) {
      return salaryRecord.dailyRate
    }

    // Ha nincs fizetéstörténet, fallback a WorkforceRegistry dailyRate-jére
    const workforceRegistry = await prisma.workforceRegistry.findFirst({
      where: { id: workforceRegistryId, tenantEmail }
    })

    return workforceRegistry?.dailyRate || 0
  } catch (error) {
    console.error('Error getting current salary:', error)
    return 0
  }
}

/**
 * Új fizetés hozzáadása
 * @param workforceRegistryId - Munkás ID
 * @param newDailyRate - Új napi fizetés
 * @param validFrom - Mikortól érvényes (alapértelmezett: ma)
 */
export async function addSalaryChange(
  workforceRegistryId: number, 
  newDailyRate: number, 
  validFrom: Date = new Date()
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantEmail } = await getTenantSafeAuth()

    // Ellenőrizzük, hogy létezik-e a munkás
    const workforceRegistry = await prisma.workforceRegistry.findFirst({
      where: { id: workforceRegistryId, tenantEmail }
    })

    if (!workforceRegistry) {
      return { success: false, error: 'Munkás nem található' }
    }

    // Ellenőrizzük, hogy nincs-e már ugyanarra a dátumra rekord
    const existingRecord = await prisma.workforceRegistrySalaryHistory.findFirst({
      where: {
        workforceRegistryId,
        tenantEmail,
        validFrom
      }
    })

    if (existingRecord) {
      // Ha van már rekord ugyanarra a dátumra, frissítsük
      await prisma.workforceRegistrySalaryHistory.update({
        where: { id: existingRecord.id },
        data: { dailyRate: newDailyRate }
      })
    } else {
      // Új rekord létrehozása
      await prisma.workforceRegistrySalaryHistory.create({
        data: {
          workforceRegistryId,
          dailyRate: newDailyRate,
          validFrom,
          tenantEmail
        }
      })
    }

    // Frissítsük a WorkforceRegistry dailyRate mezőjét is (kompatibilitásért)
    await prisma.workforceRegistry.update({
      where: { id: workforceRegistryId },
      data: { dailyRate: newDailyRate }
    })

    return { success: true }
  } catch (error) {
    console.error('Error adding salary change:', error)
    return { success: false, error: 'Hiba a fizetés mentése során' }
  }
}

/**
 * Fizetéstörténet lekérése
 * @param workforceRegistryId - Munkás ID
 * @returns Fizetéstörténet lista
 */
export async function getSalaryHistory(workforceRegistryId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth()

    const salaryHistory = await prisma.workforceRegistrySalaryHistory.findMany({
      where: {
        workforceRegistryId,
        tenantEmail
      },
      orderBy: { validFrom: 'desc' }
    })

    return salaryHistory
  } catch (error) {
    console.error('Error getting salary history:', error)
    return []
  }
}


/**
 * Batch fizetés lekérés egy időszakra (optimalizált)
 * @param workerIds - Munkás ID-k listája
 * @param startDate - Kezdő dátum
 * @param endDate - Vég dátum
 * @returns Map: workerId -> Map(date -> dailyRate)
 */
export async function getSalariesForPeriod(
  workerIds: number[], 
  startDate: Date, 
  endDate: Date
): Promise<Map<number, Map<string, number>>> {
  try {
    const { tenantEmail } = await getTenantSafeAuth()

    const salaryHistories = await prisma.workforceRegistrySalaryHistory.findMany({
      where: {
        workforceRegistryId: { in: workerIds },
        tenantEmail,
        validFrom: { lte: endDate }
      },
      orderBy: [
        { workforceRegistryId: 'asc' },
        { validFrom: 'desc' }
      ]
    })

    // Cache építése
    const salaryCache = new Map<number, Map<string, number>>()
    
    for (const workerId of workerIds) {
      const workerSalaries = salaryHistories.filter((sh: any) => sh.workforceRegistryId === workerId)
      const dateMap = new Map<string, number>()
      
      // Minden napra kiszámítjuk a fizetést
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Keressük meg a legutolsó fizetési rekordot erre a dátumra
        const applicableSalary = workerSalaries.find((ws: any) => ws.validFrom <= currentDate)
        dateMap.set(dateStr, applicableSalary?.dailyRate || 0)
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      salaryCache.set(workerId, dateMap)
    }

    return salaryCache
  } catch (error) {
    console.error('Error getting salaries for period:', error)
    return new Map()
  }
}
