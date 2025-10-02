import { useMemo } from "react";
import type { WorkItem, Worker } from "@/types/work";
import type { WorkforceRegistryData } from "@/actions/workforce-registry-actions";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import {
  calculatePerformance,
  type PerformanceCalculationResult,
} from "@/utils/performance-calculator";

// --- Típusok ---
export interface PerformanceData {
  totalRevenue: number;
  totalCost: number;
  totalSalary: number;
  totalProfit: number;
  profitPercentage: number;
  progressByWorkItem: { name: string; totalProgress: number; unit: string }[];
  hoursByWorker: { name: string; totalHours: number }[];
  workerPerformances: {
    name: string;
    totalHours: number;
    totalRevenue: number;
    totalCost: number;
    performancePercentage: number;
    previousPeriodPerformance?: number;
    performanceChange?: number;
  }[];
  workItemPerformances: {
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
  }[];
  previousPeriodPerformance?: number;
  performanceChange?: number;
}

interface PerformanceHookProps {
  diaries: any[]; // A típus-inkonzisztenciák miatt egyelőre 'any'
  workItems: WorkItem[];
  workers: Worker[];
  workforceRegistry: any[]; // WorkforceRegistry adatok
  currentDate: Date;
  view: "dayGridMonth" | "timeGridWeek";
}

// --- A Hook ---
export const usePerformanceData = ({
  diaries,
  workItems,
  workers, // Ez a teljes 'work.workers' lista
  workforceRegistry,
  currentDate,
  view,
}: PerformanceHookProps): PerformanceData | null => {
  const performanceData = useMemo(() => {
    const startDate =
      view === "timeGridWeek"
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
    const endDate =
      view === "timeGridWeek"
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate);

    // Helper to get YYYY-MM-DD from a Date object, respecting local timezone for start/end
    const toISODateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateString = toISODateString(startDate);
    const endDateString = toISODateString(endDate);

    // 1. Összes workDiaryItem összegyűjtése minden diary-ból
    const allWorkDiaryItems: any[] = [];
    diaries.forEach((diary) => {
      (diary.workDiaryItems || []).forEach((diaryItem: any) => {
        allWorkDiaryItems.push(diaryItem);
      });
    });

    // 2. WorkDiaryItem-ek szűrése a saját dátumuk alapján
    const relevantWorkDiaryItems = allWorkDiaryItems.filter((diaryItem) => {
      if (!diaryItem.date) return false;
      // diaryItem.date lehet string vagy Date objektum
      let itemDateString: string;
      if (typeof diaryItem.date === "string") {
        itemDateString = diaryItem.date.substring(0, 10);
      } else {
        // Date objektum esetén
        itemDateString = toISODateString(diaryItem.date);
      }
      return (
        itemDateString >= startDateString && itemDateString <= endDateString
      );
    });

    if (relevantWorkDiaryItems.length === 0) {
      return null;
    }

    // 3. Teljesítmény számítás a külön függvénnyel
    return calculatePerformance({
      workDiaryItems: relevantWorkDiaryItems,
      workItems,
      workers,
      workforceRegistry,
      allDiaryItems: diaries,
      currentDate,
      view,
    });
  }, [diaries, workItems, workers, currentDate, view]);

  return performanceData;
};
