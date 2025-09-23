import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  getWorkDiariesByWorkId,
  WorkDiaryWithItem,
} from "@/actions/get-workdiariesbyworkid-actions";
import { getAllWorkforceRegistry } from "@/actions/workforce-registry-actions";
import { notFound } from "next/navigation";
import { WorkItem, Worker } from "@/types/work"; // Importáljuk a hiányzó típusokat
import DiaryPageClient from "./DiaryPageClient";
import { Work } from "../../works/page";

interface DiaryPageProps {
  params: { id: string };
  searchParams: { diaryType?: string };
}

export default async function DiaryPage({ params, searchParams }: DiaryPageProps) {
  const workId = Number(params.id);
  const { diaryType } = searchParams;
  if (!workId) return notFound();

  let work: (Work & { workers: Worker[], expectedProfitPercent: number | null }) | null = null;
  let items: WorkItem[] = [];
  let diaries: WorkDiaryWithItem[] = [];
  let workforceRegistry: any[] = [];
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

    work = workData as any;
    items = itemData;
    diaries = diaryData;
    workforceRegistry = workforceData || [];

  } catch (e: any) {
    error = e.message || "Hiba történt az adatok lekérése közben.";
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
      />
    </div>
  );
}
