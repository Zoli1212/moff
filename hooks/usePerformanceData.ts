import { useMemo } from 'react';
import { WorkItem, Worker } from '@/types/work';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// --- Típusok ---
export interface PerformanceData {
  totalRevenue: number;
  totalCost: number;
  performancePercentage: number;
  progressByWorkItem: { name: string; totalProgress: number; unit: string }[];
  hoursByWorker: { name: string; totalHours: number }[];
}

interface PerformanceHookProps {
  diaries: any[]; // A típus-inkonzisztenciák miatt egyelőre 'any'
  workItems: WorkItem[];
  workers: Worker[];
  expectedProfitPercent: number | null;
  currentDate: Date;
  view: 'dayGridMonth' | 'timeGridWeek';
}

// --- Segédfüggvények ---
const getHourlyRate = (dailyRate: number | null | undefined): number => {
  if (!dailyRate) return 0;
  return dailyRate / 8; // Feltételezzük a 8 órás munkanapot
};

// --- A Hook ---
export const usePerformanceData = ({
  diaries,
  workItems,
  workers, // Ez a teljes 'work.workers' lista
  expectedProfitPercent,
  currentDate,
  view,
}: PerformanceHookProps): PerformanceData | null => {

  const performanceData = useMemo(() => {
    const startDate = view === 'timeGridWeek' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
    const endDate = view === 'timeGridWeek' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);

    // Helper to get YYYY-MM-DD from a Date object, respecting local timezone for start/end
    const toISODateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const startDateString = toISODateString(startDate);
    const endDateString = toISODateString(endDate);

    // 1. Összes workDiaryItem összegyűjtése minden diary-ból
    const allWorkDiaryItems: any[] = [];
    diaries.forEach(diary => {
        (diary.workDiaryItems || []).forEach((diaryItem: any) => {
            allWorkDiaryItems.push(diaryItem);
        });
    });

    // 2. WorkDiaryItem-ek szűrése a saját dátumuk alapján
    const relevantWorkDiaryItems = allWorkDiaryItems.filter(diaryItem => {
        if (!diaryItem.date) return false;
        // diaryItem.date lehet string vagy Date objektum
        let itemDateString: string;
        if (typeof diaryItem.date === 'string') {
            itemDateString = diaryItem.date.substring(0, 10);
        } else {
            // Date objektum esetén
            itemDateString = toISODateString(diaryItem.date);
        }
        return itemDateString >= startDateString && itemDateString <= endDateString;
    });

    if (relevantWorkDiaryItems.length === 0) {
        return null;
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const progressByWorkItemMap = new Map<number, { name: string; totalProgress: number; unit: string }>();
    const hoursByWorkerMap = new Map<string, { name: string; totalHours: number }>();

    // 3. Költségek és bevételek számítása a releváns workDiaryItem-ek alapján
    relevantWorkDiaryItems.forEach((diaryItem: any) => {
            const workItem = workItems.find(wi => wi.id === diaryItem.workItemId);
            if (!workItem) return;

            // Bevétel számítása: a haladás arányában az ajánlati munkadíjból
            const progressMade = diaryItem.quantity - (diaryItem.startQuantity || 0);
            if (progressMade > 0 && workItem.workTotal && workItem.quantity > 0) {
                const revenuePerUnit = workItem.workTotal / workItem.quantity;
                totalRevenue += progressMade * revenuePerUnit;
            }

            // Költség számítása: a naplóban rögzített munkások órái alapján
            const workerAssignment = workItem.workItemWorkers.find(wiw => wiw.workerId === diaryItem.workerId);
            const dailyRate = workerAssignment?.workforceRegistry?.dailyRate;
            const hourlyRate = getHourlyRate(dailyRate);
            const hoursWorked = diaryItem.workHours || 0;
            totalCost += hoursWorked * hourlyRate;

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

            // Munkafázis haladásának aggregálása
            if (progressMade > 0) {
                const existingProgress = progressByWorkItemMap.get(workItem.id);
                progressByWorkItemMap.set(workItem.id, {
                    name: workItem.name,
                    totalProgress: (existingProgress?.totalProgress || 0) + progressMade,
                    unit: workItem.unit,
                });
            }
    });

    // 2. Teljesítmény százalék számítása a megadott képlet alapján
    const calculatePerformance = (cost: number, revenue: number, targetProfitPercent: number | null) => {
      if (cost <= 0) {
        return revenue > 0 ? 200 : 0;
      }
      const actualProfitRatio = (revenue / cost - 1);
      const targetProfitRatio = (targetProfitPercent ?? 100) / 100;
      if (targetProfitRatio <= 0) {
        return actualProfitRatio > 0 ? 200 : 100;
      }
      const performance = (actualProfitRatio / targetProfitRatio) * 100;
      return Math.max(0, performance);
    }

    const performancePercentage = calculatePerformance(totalCost, totalRevenue, expectedProfitPercent);

    return {
        totalRevenue,
        totalCost,
        performancePercentage: Math.round(Math.min(200, Math.max(0, performancePercentage))),
        progressByWorkItem: Array.from(progressByWorkItemMap.values()),
        hoursByWorker: Array.from(hoursByWorkerMap.values()),
    };

  }, [diaries, workItems, workers, expectedProfitPercent, currentDate, view]);

  return performanceData;
};
