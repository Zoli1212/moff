import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  getWorkDiariesByWorkId,
  WorkDiaryWithItem,
} from "@/actions/get-workdiariesbyworkid-actions";

import React from "react";
import DiaryTaskCardList from "./_components/DiaryTaskCardList";
import DiaryTypeSelector from "./_components/DiaryTypeSelector";
import { notFound } from "next/navigation";
import { WorkItem, WorkItemWorker } from "@/types/work";

interface DiaryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ diaryType?: string }>;
}

export default async function DiaryPage({ params, searchParams }: DiaryPageProps) {
  // This part is server-side, but we need diaryType state client-side
  // So we split the page: fetch data here, render UI in an inner client component
  const { id } = await params;
  const { diaryType } = await searchParams;
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
        item.workItemWorkers?.map((w: WorkItemWorker) => ({
          ...w,
          name: w.name ?? undefined,
          role: w.role ?? undefined,
        })) ?? [],
    }));
    diaries = await getWorkDiariesByWorkId(workId);
  } catch (e) {
    error = (e as Error)?.message || "Munkafázisok vagy napló betöltési hiba";
  }
  const diaryIds = new Set(diaries.map((d) => d.workItemId));

  const type: "workers" | "contractor" = diaryType === "contractor" ? "contractor" : "workers";
  const baseUrl = `/works/diary/${workId}`;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Munkanapló</h1>
      <div className="flex gap-4 mb-6 justify-center">
        <a
          href={`${baseUrl}?diaryType=workers`}
          className={`px-6 py-2 text-base font-semibold rounded-lg ${type === "workers" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
          style={{ textDecoration: "none" }}
        >
          Munkások naplója
        </a>
        <a
          href={`${baseUrl}?diaryType=contractor`}
          className={`px-6 py-2 text-base font-semibold rounded-lg ${type === "contractor" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
          style={{ textDecoration: "none" }}
        >
          E napló
        </a>
      </div>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>
      )}
      {/* Branch UI based on diaryType if needed */}
      <DiaryTaskCardList items={items} diaryIds={Array.from(diaryIds)} diaries={diaries} />
    </div>
  );
}

