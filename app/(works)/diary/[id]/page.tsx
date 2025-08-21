import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getWorkDiariesByWorkId, WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

import { notFound } from "next/navigation";
import { WorkItem } from "@/types/work";
import DiaryPageClient from "./DiaryPageClient";

interface DiaryPageProps {
  params: { id: string };
  searchParams: { diaryType?: string };
}

export default async function DiaryPage({ params, searchParams }: DiaryPageProps) {
  const { id } = params;
  const { diaryType } = searchParams;
  const workId = Number(id);
  if (!workId) return notFound();

  let items: WorkItem[] = [];
  let diaries: WorkDiaryWithItem[] = [];
  let error: string | null = null;
  try {
    const rawItems = await getWorkItemsWithWorkers(workId);
    items = rawItems.map((item: WorkItem) => ({
      ...item,
      materials: Array.isArray(item.materials) ? item.materials : [],
      workers: Array.isArray(item.workers) ? item.workers : [],
      description: item.description ?? undefined,
      workItemWorkers:
        item.workItemWorkers?.map((w: any) => ({
          ...w,
          name: w.name ?? undefined,
          role: w.role ?? undefined,
        })) ?? [],
    }));
    diaries = await getWorkDiariesByWorkId(workId);
  } catch (e) {
    error = (e as Error)?.message || "Munkafázisok vagy napló betöltési hiba";
  }
  const diaryIds = Array.from(new Set(diaries.map((d) => d.workItemId)));
  const type: "workers" | "contractor" = diaryType === "contractor" ? "contractor" : "workers";

  return (
    <div className="px-3 sm:px-4 md:px-0 pt-3 sm:pt-4 md:pt-0">
      <DiaryPageClient
        items={items}
        diaries={diaries}
        error={error}
        type={type}
        diaryIds={diaryIds}
      />
    </div>
  );
}


