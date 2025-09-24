import type { WorkItem, Worker } from '@/types/work';
import type { WorkforceRegistryData } from '@/actions/workforce-registry-actions';

// Segédfüggvény: órabér számítása napi díjból
export const getHourlyRate = (dailyRate: number | null | undefined): number => {
  if (!dailyRate) return 0;
  return dailyRate / 8; // Feltételezzük a 8 órás munkanapot
};

// Profi típusok
export interface PerformanceCalculationResult {
  totalRevenue: number;
  totalCost: number;
  performancePercentage: number;
  progressByWorkItem: { name: string; totalProgress: number; unit: string }[];
  hoursByWorker: { name: string; totalHours: number }[];
}

export interface PerformanceCalculationInput {
  workDiaryItems: any[];
  workItems: WorkItem[];
  workers: Worker[];
  workforceRegistry: WorkforceRegistryData[];
  expectedProfitPercent: number | null;
}

// Fő teljesítmény számítási függvény
export const calculatePerformance = ({
  workDiaryItems,
  workItems,
  workers,
  workforceRegistry,
  expectedProfitPercent
}: PerformanceCalculationInput): PerformanceCalculationResult => {
  
  let totalRevenue = 0;
  let totalCost = 0;
  const progressByWorkItemMap = new Map<number, { name: string; totalProgress: number; unit: string }>();
  const hoursByWorkerMap = new Map<string, { name: string; totalHours: number }>();

         // Költségek és bevételek számítása a releváns workDiaryItem-ek alapján
         workDiaryItems.forEach((diaryItem: any, index: number) => {
           const workItem = workItems.find(wi => wi.id === diaryItem.workItemId);
           if (!workItem) {
             return;
           }

           // Bevétel számítása: a haladás arányában a workItem unitPrice alapján
           const progressMade = diaryItem.quantity || 0;
           
           if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
             const revenuePerUnit = workItem.unitPrice;
             const itemRevenue = progressMade * revenuePerUnit;
             totalRevenue += itemRevenue;
             
             console.log(`💰 Revenue calculation for ${workItem.name}:`);
             console.log(`  - Progress made: ${progressMade} ${workItem.unit}`);
             console.log(`  - Unit price: ${revenuePerUnit} Ft/${workItem.unit}`);
             console.log(`  - Item revenue: ${progressMade} × ${revenuePerUnit} = ${itemRevenue} Ft`);
             console.log(`  - Total revenue so far: ${totalRevenue} Ft`);
           } else {
             console.log(`❌ No revenue for ${workItem.name}:`);
             console.log(`  - Progress made: ${progressMade}`);
             console.log(`  - Unit price: ${workItem.unitPrice}`);
             console.log(`  - WorkItem quantity: ${workItem.quantity}`);
           }

           // Költség számítása: a naplóban rögzített munkások órái alapján
           const workerAssignment = workItem.workItemWorkers?.find(wiw => wiw.workerId === diaryItem.workerId);
           
           // Ha nincs workItemWorkers, próbáljuk meg közvetlenül a workers tömbből
           let dailyRate = workerAssignment?.workforceRegistry?.dailyRate;
           
           // Ha még mindig nincs dailyRate, keressük meg a WorkforceRegistry-ben név alapján
           if (!dailyRate && diaryItem.name) {
             // Először próbáljuk meg pontos egyezést
             let workforceWorker = workforceRegistry.find(wr => 
               wr.name.toLowerCase() === diaryItem.name.toLowerCase()
             );
             
             // Ha nincs pontos egyezés, próbáljuk meg részleges egyezést
             if (!workforceWorker) {
               workforceWorker = workforceRegistry.find(wr => 
                 wr.name.toLowerCase().includes(diaryItem.name.toLowerCase()) ||
                 diaryItem.name.toLowerCase().includes(wr.name.toLowerCase())
               );
             }
             
             if (workforceWorker) {
               dailyRate = workforceWorker.dailyRate;
             }
           }
           
           // Ha még mindig nincs dailyRate, használjunk alapértelmezett értéket
           if (!dailyRate) {
             dailyRate = 80000; // Alapértelmezett napi díj: 80,000 Ft
           }
    
           const hourlyRate = getHourlyRate(dailyRate);
           const hoursWorked = diaryItem.workHours || 0;
           const itemCost = hoursWorked * hourlyRate;
           totalCost += itemCost;
           
           console.log('💸 Cost calculation:', {
             dailyRate,
             hourlyRate,
             hoursWorked,
             itemCost,
             totalCost
           });

    // Munkás óráinak aggregálása
    if (hoursWorked > 0) {
      // Munkás nevének meghatározása
      let workerName = 'Ismeretlen';
      
      // 1. Ha van név közvetlenül a diaryItem-ben
      if (diaryItem.name) {
        workerName = diaryItem.name;
      }
      // 2. Ha van workerId, keressük a workers tömbben
      else if (diaryItem.workerId) {
        const workerDetails = workers.find(w => w.id === diaryItem.workerId);
        if (workerDetails?.name) {
          workerName = workerDetails.name;
        }
      }
      
      // A nevet használjuk kulcsként (nem a workerId-t), mert több munkásnak lehet ugyanaz a workerId
      if (workerName && workerName !== 'Ismeretlen') {
        const existingWorker = hoursByWorkerMap.get(workerName);
        hoursByWorkerMap.set(workerName, {
            name: workerName,
            totalHours: (existingWorker?.totalHours || 0) + hoursWorked,
        });
      }
    }

    // Munkafázis haladásának aggregálása - minden workItem megjelenik, ahol dolgoztak
    const existingProgress = progressByWorkItemMap.get(workItem.id);
    progressByWorkItemMap.set(workItem.id, {
        name: workItem.name,
        totalProgress: (existingProgress?.totalProgress || 0) + progressMade,
        unit: workItem.unit,
    });
  });

         // Teljesítmény százalék számítása
         const performancePercentage = calculatePerformancePercentage(totalCost, totalRevenue, expectedProfitPercent);

         console.log('\n=== FINAL RESULTS ===');
         console.log('totalRevenue:', totalRevenue);
         console.log('totalCost:', totalCost);
         console.log('expectedProfitPercent:', expectedProfitPercent);
         console.log('performancePercentage:', performancePercentage);
         console.log('progressByWorkItem count:', progressByWorkItemMap.size);
         console.log('hoursByWorker count:', hoursByWorkerMap.size);

  return {
      totalRevenue,
      totalCost,
      performancePercentage: Math.round(Math.min(200, Math.max(0, performancePercentage))),
      progressByWorkItem: Array.from(progressByWorkItemMap.values()),
      hoursByWorker: Array.from(hoursByWorkerMap.values()),
  };
};

// Teljesítmény százalék számítása
export const calculatePerformancePercentage = (
  cost: number, 
  revenue: number, 
  targetProfitPercent: number | null
): number => {
  // Ha nincs költség, nem lehet profitot számolni
  if (cost <= 0) {
    return 0;
  }
  
  const actualProfitRatio = (revenue / cost - 1);
  const targetProfitRatio = (targetProfitPercent ?? 50) / 100; // Alapértelmezett 50% helyett 100%
  
  if (targetProfitRatio <= 0) {
    return 0; // Ha nincs cél, akkor 0%
  }
  
  const performance = (actualProfitRatio / targetProfitRatio) * 100;
  return Math.max(0, performance);
};
