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
    const salaryRecord = await prisma.WorkforceRegistrySalaryHistory.findFirst({
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

    // AUTOMATIKUS SNAPSHOT FRISSÍTÉS: Frissítsük az összes érintett napló bejegyzés snapshot-ját
    await updateAffectedSalarySnapshots(workforceRegistryId, validFrom, tenantEmail)

    return { success: true }
  } catch (error) {
    console.error('Error adding salary change:', error)
    return { success: false, error: 'Hiba a fizetés mentése során' }
  }
}

/**
 * Automatikus snapshot frissítés - frissíti az érintett napló bejegyzések snapshot-jait
 * @param workforceRegistryId - Munkás ID
 * @param validFrom - Mikortól érvényes a fizetésváltozás
 * @param tenantEmail - Tenant email
 */
async function updateAffectedSalarySnapshots(
  workforceRegistryId: number, 
  validFrom: Date, 
  tenantEmail: string
): Promise<void> {
  try {
    console.log(`🔄 [AUTO-SYNC] Starting automatic snapshot update for worker ${workforceRegistryId} from ${validFrom.toISOString().split('T')[0]}`)

    // 1. Lekérjük a munkás nevét
    const worker = await prisma.workforceRegistry.findFirst({
      where: { id: workforceRegistryId, tenantEmail }
    })

    if (!worker) {
      console.warn(`⚠️ [AUTO-SYNC] Worker ${workforceRegistryId} not found`)
      return
    }

    // 2. Lekérjük az összes érintett napló bejegyzést (validFrom dátumtól kezdve)
    const diaryItemsByName = await prisma.workDiaryItem.findMany({
      where: { 
        name: { equals: worker.name, mode: 'insensitive' },
        tenantEmail,
        date: { gte: validFrom }
      }
    })

    const workItemWorkerIds = await prisma.workItemWorker.findMany({
      where: { workforceRegistryId, tenantEmail },
      select: { id: true }
    })

    const diaryItemsByWorkItemWorker = workItemWorkerIds.length > 0 
      ? await prisma.workDiaryItem.findMany({
          where: { 
            workItemWorkerId: { in: workItemWorkerIds.map(w => w.id) },
            tenantEmail,
            date: { gte: validFrom }
          }
        })
      : []

    // 3. Egyesítjük és deduplikáljuk a bejegyzéseket
    const allDiaryItems = new Map()
    diaryItemsByName.forEach(item => allDiaryItems.set(item.id, item))
    diaryItemsByWorkItemWorker.forEach(item => allDiaryItems.set(item.id, item))
    
    const uniqueDiaryItems = Array.from(allDiaryItems.values())

    console.log(`📊 [AUTO-SYNC] Found ${uniqueDiaryItems.length} diary items to update for ${worker.name}`)

    // 4. Frissítjük minden érintett bejegyzés snapshot-ját
    let updatedCount = 0

    for (const item of uniqueDiaryItems) {
      const itemDate = item.date || new Date()
      
      // Lekérjük az adott napra érvényes új fizetést
      const correctSalary = await getCurrentSalary(workforceRegistryId, itemDate)
      
      if (item.dailyRateSnapshot !== correctSalary) {
        await prisma.workDiaryItem.update({
          where: { id: item.id },
          data: { dailyRateSnapshot: correctSalary }
        })
        
        console.log(`✅ [AUTO-SYNC] Updated item ${item.id}: ${item.dailyRateSnapshot} → ${correctSalary} Ft (${itemDate.toISOString().split('T')[0]})`)
        updatedCount++
      }
    }

    console.log(`🎉 [AUTO-SYNC] Completed for ${worker.name}: ${updatedCount} snapshots updated automatically`)

  } catch (error) {
    console.error('❌ [AUTO-SYNC] Error updating salary snapshots:', error)
    // Ne dobjunk hibát, csak loggoljuk - ne blokkoljuk a fizetés mentést
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
