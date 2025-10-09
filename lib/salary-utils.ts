import type { WorkforceRegistryData } from "@/actions/workforce-registry-actions";
import type { WorkDiaryItemDTO } from "@/actions/get-workdiariesbyworkid-actions";

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
  diaryItem: WorkDiaryItemDTO | { name?: string | null; dailyRateSnapshot?: number | null },
  workforceRegistry: WorkforceRegistryData[]
): number {
  // 1. Első prioritás: snapshot használata (ha van)
  if (diaryItem.dailyRateSnapshot && diaryItem.dailyRateSnapshot > 0) {
    return diaryItem.dailyRateSnapshot;
  }

  // 2. Második prioritás: fallback a workforceRegistry.dailyRate-re
  // (Ez most már az új fizetési rendszer által frissített értéket tartalmazza)
  const workforceWorker = workforceRegistry.find(
    (wr) => wr.name.toLowerCase() === (diaryItem.name || "").toLowerCase()
  );

  const fallbackRate = workforceWorker?.dailyRate || 0;
  
  return fallbackRate;
}
