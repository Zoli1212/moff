'use server'

import { prisma } from '@/lib/prisma'
import { getTenantSafeAuth } from '@/lib/tenant-auth'
import { getCurrentSalary } from '@/utils/salary-helper'
import { revalidatePath } from 'next/cache'

/**
 * Visszamenőleges snapshot szinkronizálás egy adott munkáshoz
 */
export async function syncWorkerSalarySnapshots(workerId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth()
    
    console.log(`🔄 [SYNC] Starting snapshot sync for worker ID: ${workerId}`)
    
    // 1. Ellenőrizzük, hogy létezik-e a munkás
    const worker = await prisma.workforceRegistry.findFirst({
      where: { id: workerId, tenantEmail, isDeleted: false }
    })
    
    if (!worker) {
      return { success: false, error: 'Munkás nem található' }
    }
    
    // 2. Lekérjük az összes napló bejegyzését (név és workItemWorker alapján is)
    const diaryItemsByName = await prisma.workDiaryItem.findMany({
      where: { 
        name: { equals: worker.name, mode: 'insensitive' },
        tenantEmail 
      }
    })
    
    const workItemWorkerIds = await prisma.workItemWorker.findMany({
      where: { workforceRegistryId: workerId, tenantEmail },
      select: { id: true }
    })
    
    const diaryItemsByWorkItemWorker = workItemWorkerIds.length > 0 
      ? await prisma.workDiaryItem.findMany({
          where: { 
            workItemWorkerId: { in: workItemWorkerIds.map(w => w.id) },
            tenantEmail 
          }
        })
      : []
    
    // 3. Egyesítjük és deduplikáljuk a bejegyzéseket
    const allDiaryItems = new Map()
    
    diaryItemsByName.forEach(item => allDiaryItems.set(item.id, item))
    diaryItemsByWorkItemWorker.forEach(item => allDiaryItems.set(item.id, item))
    
    const uniqueDiaryItems = Array.from(allDiaryItems.values())
    
    console.log(`📊 [SYNC] Found ${uniqueDiaryItems.length} diary items for ${worker.name}`)
    
    // 4. Frissítjük minden bejegyzés snapshot-ját
    let updatedCount = 0
    let skippedCount = 0
    
    for (const item of uniqueDiaryItems) {
      const itemDate = item.date || new Date()
      
      // Lekérjük az adott napra érvényes fizetést a salary history alapján
      const correctSalary = await getCurrentSalary(workerId, itemDate)
      
      if (item.dailyRateSnapshot !== correctSalary) {
        await prisma.workDiaryItem.update({
          where: { id: item.id },
          data: { dailyRateSnapshot: correctSalary }
        })
        
        console.log(`✅ [SYNC] Updated item ${item.id}: ${item.dailyRateSnapshot} → ${correctSalary} Ft (${itemDate.toISOString().split('T')[0]})`)
        updatedCount++
      } else {
        skippedCount++
      }
    }
    
    console.log(`🎉 [SYNC] Completed for ${worker.name}: ${updatedCount} updated, ${skippedCount} skipped`)
    
    // 5. Revalidate paths
    revalidatePath('/works')
    revalidatePath('/others')
    
    return { 
      success: true, 
      workerName: worker.name,
      totalItems: uniqueDiaryItems.length,
      updatedCount, 
      skippedCount 
    }
    
  } catch (error) {
    console.error('❌ [SYNC] Error syncing salary snapshots:', error)
    return { success: false, error: 'Hiba a snapshot szinkronizálás során' }
  }
}

/**
 * Visszamenőleges snapshot szinkronizálás az összes munkáshoz
 */
export async function syncAllWorkersSalarySnapshots() {
  try {
    const { tenantEmail } = await getTenantSafeAuth()
    
    console.log(`🔄 [SYNC] Starting snapshot sync for all workers`)
    
    // 1. Lekérjük az összes aktív munkást
    const workers = await prisma.workforceRegistry.findMany({
      where: { tenantEmail, isDeleted: false },
      orderBy: { name: 'asc' }
    })
    
    console.log(`👥 [SYNC] Found ${workers.length} workers to sync`)
    
    let totalUpdated = 0
    let totalSkipped = 0
    const results = []
    
    // 2. Szinkronizáljuk minden munkást
    for (const worker of workers) {
      const result = await syncWorkerSalarySnapshots(worker.id)
      
      if (result.success) {
        totalUpdated += result.updatedCount || 0
        totalSkipped += result.skippedCount || 0
        results.push({
          workerName: result.workerName,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount
        })
      } else {
        console.error(`❌ [SYNC] Failed for worker ${worker.name}:`, result.error)
      }
    }
    
    console.log(`🎉 [SYNC] All workers completed: ${totalUpdated} total updated, ${totalSkipped} total skipped`)
    
    return { 
      success: true, 
      totalWorkers: workers.length,
      totalUpdated, 
      totalSkipped,
      results 
    }
    
  } catch (error) {
    console.error('❌ [SYNC] Error syncing all workers:', error)
    return { success: false, error: 'Hiba az összes munkás szinkronizálása során' }
  }
}

/**
 * Egy adott dátum utáni snapshot-ok szinkronizálása
 */
export async function syncSalarySnapshotsAfterDate(afterDate: Date) {
  try {
    const { tenantEmail } = await getTenantSafeAuth()
    
    console.log(`🔄 [SYNC] Starting snapshot sync for items after ${afterDate.toISOString().split('T')[0]}`)
    
    // 1. Lekérjük az összes napló bejegyzést a megadott dátum után
    const diaryItems = await prisma.workDiaryItem.findMany({
      where: { 
        tenantEmail,
        date: { gte: afterDate }
      },
      include: {
        workItemWorker: {
          include: {
            workforceRegistry: true
          }
        }
      }
    })
    
    console.log(`📊 [SYNC] Found ${diaryItems.length} diary items after ${afterDate.toISOString().split('T')[0]}`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    // 2. Frissítjük minden bejegyzést
    for (const item of diaryItems) {
      let workerId: number | null = null
      
      // Munkás ID meghatározása
      if (item.workItemWorker?.workforceRegistry) {
        workerId = item.workItemWorker.workforceRegistry.id
      } else if (item.name) {
        // Fallback: név alapján keresés
        const worker = await prisma.workforceRegistry.findFirst({
          where: { 
            name: { equals: item.name, mode: 'insensitive' },
            tenantEmail 
          }
        })
        workerId = worker?.id || null
      }
      
      if (workerId) {
        const itemDate = item.date || new Date()
        const correctSalary = await getCurrentSalary(workerId, itemDate)
        
        if (item.dailyRateSnapshot !== correctSalary) {
          await prisma.workDiaryItem.update({
            where: { id: item.id },
            data: { dailyRateSnapshot: correctSalary }
          })
          
          console.log(`✅ [SYNC] Updated item ${item.id}: ${item.dailyRateSnapshot} → ${correctSalary} Ft`)
          updatedCount++
        } else {
          skippedCount++
        }
      } else {
        console.warn(`⚠️ [SYNC] Could not find worker for item ${item.id} (name: ${item.name})`)
        skippedCount++
      }
    }
    
    console.log(`🎉 [SYNC] Date-based sync completed: ${updatedCount} updated, ${skippedCount} skipped`)
    
    // 3. Revalidate paths
    revalidatePath('/works')
    revalidatePath('/others')
    
    return { 
      success: true, 
      totalItems: diaryItems.length,
      updatedCount, 
      skippedCount 
    }
    
  } catch (error) {
    console.error('❌ [SYNC] Error syncing snapshots after date:', error)
    return { success: false, error: 'Hiba a dátum alapú szinkronizálás során' }
  }
}
