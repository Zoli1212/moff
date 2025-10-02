/**
 * Utility függvények fizetés számításokhoz (nem server actions)
 */

/**
 * Backward compatibility függvény - napló bejegyzéshez fizetés lekérése
 * @param diaryItem - Napló bejegyzés
 * @param workforceRegistry - WorkforceRegistry lista (fallback-hez)
 * @returns Napi fizetés
 */
export function getDailyRateForDiaryItem(
  diaryItem: any, 
  workforceRegistry: any[]
): number {
  // 1. Új módszer: snapshot használata
  if (diaryItem.dailyRateSnapshot && diaryItem.dailyRateSnapshot > 0) {
    return diaryItem.dailyRateSnapshot
  }
  
  // 2. Fallback: régi módszer - workforceRegistry-ből név alapján
  const workforceWorker = workforceRegistry.find(wr => 
    wr.name.toLowerCase() === (diaryItem.name || "").toLowerCase()
  )
  
  return workforceWorker?.dailyRate || 0
}
