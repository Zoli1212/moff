import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  getWorkDiariesByWorkId,
  WorkDiaryWithItem,
} from "@/actions/get-workdiariesbyworkid-actions";

import DiaryTaskCardList from "./_components/DiaryTaskCardList";
import { notFound } from "next/navigation";
import { WorkItem, WorkItemWorker } from "@/types/work";

interface DiaryPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiaryPage({ params }: DiaryPageProps) {
  const workId = Number((await params).id);
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
        item.workItemWorkers?.map((w: WorkItemWorker) => ({
          ...w,
          name: w.name ?? undefined,
          role: w.role ?? undefined,
        })) ?? [],
    }));
    diaries = await getWorkDiariesByWorkId(workId);
  } catch (e: any) {
    error = e?.message || "Munkafázisok vagy napló betöltési hiba";
  }

  // workItemId-k amikhez van napló
  const diaryIds = new Set(diaries.map((d) => d.workItemId));

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Munkanapló</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>
      )}
      <DiaryTaskCardList items={items} diaryIds={Array.from(diaryIds)} />
    </div>
  );
}
