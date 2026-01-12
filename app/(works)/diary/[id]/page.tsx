import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  getWorkDiariesByWorkId,
  WorkDiaryWithItem,
} from "@/actions/get-workdiariesbyworkid-actions";
import { getAllWorkforceRegistry, WorkforceRegistryData, getWorkerRestrictionStatus } from "@/actions/workforce-registry-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import { notFound, redirect } from "next/navigation";
import { WorkItem, Worker } from "@/types/work"; // Importáljuk a hiányzó típusokat
import DiaryPageClient from "./DiaryPageClient";
import { Work } from "../../works/page";

// MarketPrice type for type casting
type MarketPrice = {
  bestPrice: number;
  supplier: string;
  url: string;
  productName: string;
  savings: number;
  checkedAt: string;
  lastRun?: string;
} | null | undefined;

interface DiaryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ diaryType?: string }>;
}

export default async function DiaryPage({ params, searchParams }: DiaryPageProps) {
  const workId = Number((await params).id);
  const { diaryType } = await searchParams;
  if (!workId) return notFound();

  // Server-side role detection - no layout shift!
  const userData = await getCurrentUserData();
  const isTenant = userData.isTenant ?? true;

  // Check if restricted worker - redirect to /works
  if (!isTenant) {
    const restrictionStatus = await getWorkerRestrictionStatus();
    if (restrictionStatus.isRestricted) {
      redirect(`/works/${workId}`);
    }
  }

  let work: (Work & { workers: Worker[], expectedProfitPercent: number | null }) | null = null;
  let items: WorkItem[] = [];
  let diaries: WorkDiaryWithItem[] = [];
  let workforceRegistry: WorkforceRegistryData[] = [];
  let error: string | null = null;

  try {
    const [workData, itemData, diaryData, workforceData] = await Promise.all([
      getWorkById(workId),
      getWorkItemsWithWorkers(workId),
      getWorkDiariesByWorkId(workId),
      getAllWorkforceRegistry(),
    ]);

    if (!workData) {
      throw new Error("A munka nem található.");
    }

    work = workData as (Work & { workers: Worker[], expectedProfitPercent: number | null });
    items = itemData.map((item) => ({
      ...item,
      currentMarketPrice: item.currentMarketPrice as MarketPrice,
      materials: item.materials.map((material) => ({
        ...material,
        bestOffer: material.bestOffer as { url: string; unit: string; price: number; supplier: string; checkedAt: string; packageSize: string; } | null | undefined,
      })),
    }));
    diaries = diaryData;
    workforceRegistry = workforceData || [];

  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Hiba történt az adatok lekérése közben.";
  }

  const diaryIds = Array.from(
    new Set(
      diaries
        .map((d) => d.workItemId)
        .filter((id): id is number => id !== null && id !== undefined)
    )
  );
  const type: "workers" | "contractor" =
    diaryType === "contractor" ? "contractor" : "workers";

  return (
    <div className="px-3 sm:px-4 md:px-0 pt-3 sm:pt-4 md:pt-0">
      <DiaryPageClient
        work={work} // Átadjuk a work objektumot
        items={items}
        diaries={diaries}
        workforceRegistry={workforceRegistry}
        error={error}
        type={type}
        diaryIds={diaryIds}
        isTenant={isTenant}
      />
    </div>
  );
}
