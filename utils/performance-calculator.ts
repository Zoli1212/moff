import type { WorkItem, Worker } from "@/types/work";
import type { WorkforceRegistryData } from "@/actions/workforce-registry-actions";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  parseISO,
} from "date-fns";
import { getDailyRateForDiaryItem } from '@/lib/salary-utils';

// Segédfüggvény: órabér számítása napi díjból
export const getHourlyRate = (dailyRate: number | null | undefined): number => {
  if (!dailyRate) return 0;
  return dailyRate / 8; // Feltételezzük a 8 órás munkanapot
};

// Profi típusok
export interface WorkerPerformance {
  name: string;
  totalHours: number;
  totalRevenue: number;
  totalCost: number;
  performancePercentage: number;
  previousPeriodPerformance?: number;
  performanceChange?: number;
}

export interface WorkItemPerformance {
  workItemId: number;
  name: string;
  unit: string;
  totalProgress: number;
  totalHours: number;
  totalRevenue: number;
  totalCost: number;
  performancePercentage: number;
  previousPeriodPerformance?: number;
  performanceChange?: number;
}

export interface PerformanceCalculationResult {
  totalRevenue: number;
  totalCost: number;
  performancePercentage: number;
  progressByWorkItem: { name: string; totalProgress: number; unit: string }[];
  hoursByWorker: { name: string; totalHours: number }[];
  workerPerformances: WorkerPerformance[];
  workItemPerformances: WorkItemPerformance[];
  previousPeriodPerformance?: number;
  performanceChange?: number;
}

export interface PerformanceCalculationInput {
  workDiaryItems: any[];
  workItems: WorkItem[];
  workers: Worker[];
  workforceRegistry: WorkforceRegistryData[];
  allDiaryItems?: any[]; // Az összes napló elem az előző időszak számításához
  currentDate?: Date;
  view?: "dayGridMonth" | "timeGridWeek";
}

// Fő teljesítmény számítási függvény
export const calculatePerformance = ({
  workDiaryItems,
  workItems,
  workers,
  workforceRegistry,
  allDiaryItems,
  currentDate,
  view,
}: PerformanceCalculationInput): PerformanceCalculationResult => {
  let totalRevenue = 0;
  let totalCost = 0;
  const progressByWorkItemMap = new Map<
    number,
    { name: string; totalProgress: number; unit: string }
  >();
  const hoursByWorkerMap = new Map<
    string,
    { name: string; totalHours: number }
  >();

  // Költségek és bevételek számítása a releváns workDiaryItem-ek alapján
  workDiaryItems.forEach((diaryItem: any, index: number) => {
    const workItem = workItems.find((wi) => wi.id === diaryItem.workItemId);
    if (!workItem) {
      return;
    }

    // Bevétel számítása: a haladás arányában a workItem unitPrice alapján
    const progressMade = diaryItem.quantity || 0;

    if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
      const revenuePerUnit = workItem.unitPrice;
      const itemRevenue = progressMade * revenuePerUnit;
      totalRevenue += itemRevenue;
    }

    // Költség számítása: új salary helper használatával (backward compatible)
    const dailyRate = getDailyRateForDiaryItem(diaryItem, workforceRegistry);

    const hourlyRate = getHourlyRate(dailyRate);
    const hoursWorked = diaryItem.workHours || 0;
    const itemCost = hoursWorked * hourlyRate;
    totalCost += itemCost;

    // Munkás óráinak aggregálása
    if (hoursWorked > 0) {
      // Munkás nevének meghatározása
      let workerName = "Ismeretlen";

      // 1. Ha van név közvetlenül a diaryItem-ben
      if (diaryItem.name) {
        workerName = diaryItem.name;
      }
      // 2. Ha van workerId, keressük a workers tömbben
      else if (diaryItem.workerId) {
        const workerDetails = workers.find((w) => w.id === diaryItem.workerId);
        if (workerDetails?.name) {
          workerName = workerDetails.name;
        }
      }

      // A nevet használjuk kulcsként (nem a workerId-t), mert több munkásnak lehet ugyanaz a workerId
      if (workerName && workerName !== "Ismeretlen") {
        const existingWorker = hoursByWorkerMap.get(workerName);
        const newTotalHours = (existingWorker?.totalHours || 0) + hoursWorked;
        hoursByWorkerMap.set(workerName, {
          name: workerName,
          totalHours: newTotalHours,
        });
      }
    }

    // Munkafázis haladásának aggregálása - minden workItem megjelenik, ahol dolgoztak
    const existingProgress = progressByWorkItemMap.get(workItem.id);
    const newTotalProgress =
      (existingProgress?.totalProgress || 0) + progressMade;
    progressByWorkItemMap.set(workItem.id, {
      name: workItem.name,
      totalProgress: newTotalProgress,
      unit: workItem.unit,
    });
  });

  // Profitráta számítása (egyszerű profitráta %)
  const performancePercentage = calculateProfitRatePercentage(
    totalCost,
    totalRevenue
  );

  // WorkItem szintű teljesítmény számítása
  let workItemPerformances = calculateWorkItemPerformances(
    workDiaryItems,
    workItems,
    workforceRegistry
  );

  // Munkás szintű teljesítmény számítása
  let workerPerformances = calculateWorkerPerformances(
    workDiaryItems,
    workItems,
    workforceRegistry
  );

  // Előző időszak teljesítményének számítása
  let previousPeriodPerformance: number | undefined;
  let performanceChange: number | undefined;

  if (allDiaryItems && currentDate && view) {
    // Összesített előző időszak teljesítmény
    previousPeriodPerformance = calculatePreviousPeriodPerformance(
      allDiaryItems,
      workItems,
      workforceRegistry,
      currentDate,
      view
    );

    if (previousPeriodPerformance !== undefined) {
      performanceChange = performancePercentage - previousPeriodPerformance;
    }

    // WorkItem szintű előző időszak teljesítmények
    const workItemPreviousPerformances =
      calculateWorkItemPreviousPeriodPerformances(
        allDiaryItems,
        workItems,
        workforceRegistry,
        currentDate,
        view
      );

    // WorkItem teljesítményekhez trend hozzáadása
    workItemPerformances = workItemPerformances.map((perf) => {
      const previousPerf = workItemPreviousPerformances.get(perf.workItemId);
      return {
        ...perf,
        previousPeriodPerformance: previousPerf,
        performanceChange:
          previousPerf !== undefined
            ? perf.performancePercentage - previousPerf
            : undefined,
      };
    });

    // Worker szintű előző időszak teljesítmények
    const workerPreviousPerformances =
      calculateWorkerPreviousPeriodPerformances(
        allDiaryItems,
        workItems,
        workforceRegistry,
        currentDate,
        view
      );

    // Worker teljesítményekhez trend hozzáadása
    workerPerformances = workerPerformances.map((perf) => {
      const previousPerf = workerPreviousPerformances.get(perf.name);
      return {
        ...perf,
        previousPeriodPerformance: previousPerf,
        performanceChange:
          previousPerf !== undefined
            ? perf.performancePercentage - previousPerf
            : undefined,
      };
    });
  }

  return {
    totalRevenue,
    totalCost,
    performancePercentage: Math.round(performancePercentage),
    progressByWorkItem: Array.from(progressByWorkItemMap.values()),
    hoursByWorker: Array.from(hoursByWorkerMap.values()),
    workerPerformances,
    workItemPerformances,
    previousPeriodPerformance,
    performanceChange,
  };
};

// Előző időszak teljesítményének számítása
export const calculatePreviousPeriodPerformance = (
  allDiaryItems: any[],
  workItems: WorkItem[],
  workforceRegistry: WorkforceRegistryData[],
  currentDate: Date,
  view: "dayGridMonth" | "timeGridWeek"
): number | undefined => {
  // Előző időszak dátumainak meghatározása
  const previousDate =
    view === "timeGridWeek"
      ? subWeeks(currentDate, 1)
      : subMonths(currentDate, 1);

  const startDate =
    view === "timeGridWeek"
      ? startOfWeek(previousDate, { weekStartsOn: 1 })
      : startOfMonth(previousDate);

  const endDate =
    view === "timeGridWeek"
      ? endOfWeek(previousDate, { weekStartsOn: 1 })
      : endOfMonth(previousDate);

  // Dátum string konverzió
  const toISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateString = toISODateString(startDate);
  const endDateString = toISODateString(endDate);

  // Előző időszak diary item-jeinek szűrése
  const previousPeriodItems: any[] = [];
  allDiaryItems.forEach((diary) => {
    (diary.workDiaryItems || []).forEach((diaryItem: any) => {
      if (!diaryItem.date) return;

      let itemDateString: string;
      if (typeof diaryItem.date === "string") {
        itemDateString = diaryItem.date.substring(0, 10);
      } else {
        itemDateString = toISODateString(diaryItem.date);
      }

      if (
        itemDateString >= startDateString &&
        itemDateString <= endDateString
      ) {
        previousPeriodItems.push(diaryItem);
      }
    });
  });

  if (previousPeriodItems.length === 0) {
    return undefined;
  }

  // Előző időszak teljesítményének számítása
  let totalRevenue = 0;
  let totalCost = 0;

  previousPeriodItems.forEach((diaryItem: any) => {
    const workItem = workItems.find((wi) => wi.id === diaryItem.workItemId);
    if (!workItem) return;

    const progressMade = diaryItem.quantity || 0;
    const hoursWorked = diaryItem.workHours || 0;

    // Bevétel számítása
    if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
      totalRevenue += progressMade * workItem.unitPrice;
    }

    // Költség számítása: új salary helper használatával (backward compatible)
    const dailyRate = getDailyRateForDiaryItem(diaryItem, workforceRegistry);
    const hourlyRate = getHourlyRate(dailyRate);
    totalCost += hoursWorked * hourlyRate;
  });
  return Math.round(calculateProfitRatePercentage(totalCost, totalRevenue));
};

// WorkItem szintű előző időszak teljesítmény számítása
export const calculateWorkItemPreviousPeriodPerformances = (
  allDiaryItems: any[],
  workItems: WorkItem[],
  workforceRegistry: WorkforceRegistryData[],
  currentDate: Date,
  view: "dayGridMonth" | "timeGridWeek"
): Map<number, number> => {
  // Előző időszak dátumainak meghatározása
  const previousDate =
    view === "timeGridWeek"
      ? subWeeks(currentDate, 1)
      : subMonths(currentDate, 1);

  const startDate =
    view === "timeGridWeek"
      ? startOfWeek(previousDate, { weekStartsOn: 1 })
      : startOfMonth(previousDate);

  const endDate =
    view === "timeGridWeek"
      ? endOfWeek(previousDate, { weekStartsOn: 1 })
      : endOfMonth(previousDate);

  // Dátum string konverzió
  const toISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateString = toISODateString(startDate);
  const endDateString = toISODateString(endDate);

  // Előző időszak diary item-jeinek szűrése
  const previousPeriodItems: any[] = [];
  allDiaryItems.forEach((diary) => {
    (diary.workDiaryItems || []).forEach((diaryItem: any) => {
      if (!diaryItem.date) return;

      let itemDateString: string;
      if (typeof diaryItem.date === "string") {
        itemDateString = diaryItem.date.substring(0, 10);
      } else {
        itemDateString = toISODateString(diaryItem.date);
      }

      if (
        itemDateString >= startDateString &&
        itemDateString <= endDateString
      ) {
        previousPeriodItems.push(diaryItem);
      }
    });
  });

  // WorkItem szintű előző időszak teljesítmények számítása
  const workItemPreviousPerformances = calculateWorkItemPerformances(
    previousPeriodItems,
    workItems,
    workforceRegistry
  );

  // Map létrehozása workItemId -> performancePercentage
  const performanceMap = new Map<number, number>();
  workItemPreviousPerformances.forEach((perf) => {
    performanceMap.set(perf.workItemId, perf.performancePercentage);
  });

  return performanceMap;
};

// WorkItem szintű teljesítmény számítása
export const calculateWorkItemPerformances = (
  workDiaryItems: any[],
  workItems: WorkItem[],
  workforceRegistry: WorkforceRegistryData[]
): WorkItemPerformance[] => {
  const workItemDataMap = new Map<
    number,
    {
      name: string;
      unit: string;
      totalProgress: number;
      totalHours: number;
      totalRevenue: number;
      totalCost: number;
    }
  >();

  // WorkItem-enkénti adatok összegyűjtése
  workDiaryItems.forEach((diaryItem: any) => {
    const workItem = workItems.find((wi) => wi.id === diaryItem.workItemId);
    if (!workItem) return;

    const progressMade = diaryItem.quantity || 0;
    const hoursWorked = diaryItem.workHours || 0;

    // Bevétel számítása
    let itemRevenue = 0;
    if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
      itemRevenue = progressMade * workItem.unitPrice;
    }

    // Költség számítása: új salary helper használatával (backward compatible)
    const dailyRate = getDailyRateForDiaryItem(diaryItem, workforceRegistry);

    const hourlyRate = getHourlyRate(dailyRate);
    const itemCost = hoursWorked * hourlyRate;

    // WorkItem adatainak frissítése
    const existing = workItemDataMap.get(workItem.id) || {
      name: workItem.name,
      unit: workItem.unit,
      totalProgress: 0,
      totalHours: 0,
      totalRevenue: 0,
      totalCost: 0,
    };

    workItemDataMap.set(workItem.id, {
      name: existing.name,
      unit: existing.unit,
      totalProgress: existing.totalProgress + progressMade,
      totalHours: existing.totalHours + hoursWorked,
      totalRevenue: existing.totalRevenue + itemRevenue,
      totalCost: existing.totalCost + itemCost,
    });
  });

  // WorkItemPerformance objektumok létrehozása
  return Array.from(workItemDataMap.entries()).map(([workItemId, data]) => ({
    workItemId,
    name: data.name,
    unit: data.unit,
    totalProgress: data.totalProgress,
    totalHours: data.totalHours,
    totalRevenue: data.totalRevenue,
    totalCost: data.totalCost,
    performancePercentage: calculateProfitRatePercentage(
      data.totalCost,
      data.totalRevenue
    ),
  }));
};

// Worker szintű előző időszak teljesítmény számítása
export const calculateWorkerPreviousPeriodPerformances = (
  allDiaryItems: any[],
  workItems: WorkItem[],
  workforceRegistry: WorkforceRegistryData[],
  currentDate: Date,
  view: "dayGridMonth" | "timeGridWeek"
): Map<string, number> => {
  // Előző időszak dátumainak meghatározása
  const previousDate =
    view === "timeGridWeek"
      ? subWeeks(currentDate, 1)
      : subMonths(currentDate, 1);

  const startDate =
    view === "timeGridWeek"
      ? startOfWeek(previousDate, { weekStartsOn: 1 })
      : startOfMonth(previousDate);

  const endDate =
    view === "timeGridWeek"
      ? endOfWeek(previousDate, { weekStartsOn: 1 })
      : endOfMonth(previousDate);

  // Dátum string konverzió
  const toISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateString = toISODateString(startDate);
  const endDateString = toISODateString(endDate);

  // Előző időszak diary item-jeinek szűrése
  const previousPeriodItems: any[] = [];
  allDiaryItems.forEach((diary) => {
    (diary.workDiaryItems || []).forEach((diaryItem: any) => {
      if (!diaryItem.date) return;

      let itemDateString: string;
      if (typeof diaryItem.date === "string") {
        itemDateString = diaryItem.date.substring(0, 10);
      } else {
        itemDateString = toISODateString(diaryItem.date);
      }

      if (
        itemDateString >= startDateString &&
        itemDateString <= endDateString
      ) {
        previousPeriodItems.push(diaryItem);
      }
    });
  });

  // Worker szintű előző időszak teljesítmények számítása
  const workerPreviousPerformances = calculateWorkerPerformances(
    previousPeriodItems,
    workItems,
    workforceRegistry
  );

  // Map létrehozása workerName -> performancePercentage
  const performanceMap = new Map<string, number>();
  workerPreviousPerformances.forEach((perf) => {
    performanceMap.set(perf.name, perf.performancePercentage);
  });

  return performanceMap;
};

// Munkásonkénti teljesítmény számítása
export const calculateWorkerPerformances = (
  workDiaryItems: any[],
  workItems: WorkItem[],
  workforceRegistry: WorkforceRegistryData[]
): WorkerPerformance[] => {
  const workerDataMap = new Map<
    string,
    {
      totalHours: number;
      totalRevenue: number;
      totalCost: number;
    }
  >();

  // Munkásonkénti adatok összegyűjtése
  workDiaryItems.forEach((diaryItem: any) => {
    const workItem = workItems.find((wi) => wi.id === diaryItem.workItemId);
    if (!workItem) return;

    const workerName = diaryItem.name || "Ismeretlen";
    const progressMade = diaryItem.quantity || 0;
    const hoursWorked = diaryItem.workHours || 0;

    // Bevétel számítása
    let itemRevenue = 0;
    if (progressMade > 0 && workItem.unitPrice && workItem.quantity > 0) {
      itemRevenue = progressMade * workItem.unitPrice;
    }

    // Költség számítása: új salary helper használatával (backward compatible)
    const dailyRate = getDailyRateForDiaryItem(diaryItem, workforceRegistry);
    const hourlyRate = getHourlyRate(dailyRate);
    const itemCost = hoursWorked * hourlyRate;

    // Munkás adatainak frissítése
    const existing = workerDataMap.get(workerName) || {
      totalHours: 0,
      totalRevenue: 0,
      totalCost: 0,
    };

    workerDataMap.set(workerName, {
      totalHours: existing.totalHours + hoursWorked,
      totalRevenue: existing.totalRevenue + itemRevenue,
      totalCost: existing.totalCost + itemCost,
    });
  });

  // WorkerPerformance objektumok létrehozása
  return Array.from(workerDataMap.entries()).map(([name, data]) => ({
    name,
    totalHours: data.totalHours,
    totalRevenue: data.totalRevenue,
    totalCost: data.totalCost,
    performancePercentage: calculateProfitRatePercentage(
      data.totalCost,
      data.totalRevenue
    ),
  }));
};

// Egyszerű profitráta számítása (nincs elvárt profitráta)
export const calculateProfitRatePercentage = (
  cost: number,
  revenue: number
): number => {
  // Ha nincs költség, nem lehet profitot számolni
  if (cost <= 0) {
    return 0;
  }

  // Ha nincs bevétel, akkor -100% profitráta
  if (revenue <= 0) {
    return -100;
  }

  // Egyszerű profitráta: (bevétel / költség - 1) * 100
  const profitRate = (revenue / cost - 1) * 100;

  return profitRate;
};

// Régi teljesítmény százalék számítása (kompatibilitásért megtartva)
export const calculatePerformancePercentage = (
  cost: number,
  revenue: number,
  targetProfitPercent: number | null
): number => {
  // Ha nincs költség, nem lehet profitot számolni
  if (cost <= 0) {
    return 0;
  }

  // Ha nincs bevétel, akkor -100% teljesítmény
  if (revenue <= 0) {
    return -100;
  }

  const actualProfitRatio = revenue / cost - 1;
  const targetProfitRatio = (targetProfitPercent ?? 50) / 100;

  if (targetProfitRatio <= 0) {
    return 0; // Ha nincs cél, akkor 0%
  }

  const performance = (actualProfitRatio / targetProfitRatio) * 100;

  // Ne korlátozzuk 0%-ra a negatív teljesítményt, hanem engedjük a negatív értékeket is
  // De korlátozzuk -100%-ra, hogy ne legyen túl extrém
  return Math.max(-100, performance);
};
