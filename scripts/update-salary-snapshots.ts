/**
 * Script: Visszamenőleges fizetés snapshot frissítés
 * 
 * Ez a script frissíti az összes napló bejegyzés dailyRateSnapshot értékét
 * a megadott munkás új fizetése alapján.
 */

import { PrismaClient } from '@prisma/client'
import { getCurrentSalary } from '../utils/salary-helper'

const prisma = new PrismaClient()

async function updateSalarySnapshots(workerName: string) {
  try {
    console.log(`🔄 Updating salary snapshots for worker: ${workerName}`)
    
    // 1. Keressük meg a munkást
    const worker = await prisma.workforceRegistry.findFirst({
      where: { 
        name: { equals: workerName, mode: 'insensitive' }
      }
    })
    
    if (!worker) {
      console.log(`❌ Worker "${workerName}" not found`)
      return
    }
    
    // 2. Keressük meg az összes napló bejegyzését
    const diaryItems = await prisma.workDiaryItem.findMany({
      where: { 
        name: { equals: workerName, mode: 'insensitive' }
      },
      orderBy: { date: 'asc' }
    })
    
    console.log(`📊 Found ${diaryItems.length} diary items for ${workerName}`)
    
    // 3. Frissítsük minden bejegyzés snapshot-ját
    let updatedCount = 0
    
    for (const item of diaryItems) {
      const itemDate = item.date || new Date()
      const currentSalary = await getCurrentSalary(worker.id, itemDate)
      
      if (item.dailyRateSnapshot !== currentSalary) {
        await prisma.workDiaryItem.update({
          where: { id: item.id },
          data: { dailyRateSnapshot: currentSalary }
        })
        
        console.log(`✅ Updated item ${item.id}: ${item.dailyRateSnapshot} → ${currentSalary} Ft (date: ${itemDate.toISOString().split('T')[0]})`)
        updatedCount++
      }
    }
    
    console.log(`🎉 Updated ${updatedCount} diary items for ${workerName}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Használat:
// updateSalarySnapshots('foo37c')
// updateSalarySnapshots('foo37b')

export { updateSalarySnapshots }
