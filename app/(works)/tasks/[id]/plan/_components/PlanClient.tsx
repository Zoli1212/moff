"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Columns3,
  GanttChartSquare,
  Plus,
} from "lucide-react";
import {
  getAssignableWorkforce,
  getWorkPlan,
} from "@/actions/work-plan-actions";
import type { WorkTaskDto } from "@/lib/work-plan/schema";
import KanbanBoard from "./KanbanBoard";
import GanttChart from "./GanttChart";
import TaskEditDialog, { type TaskDraft } from "./TaskEditDialog";
import GeneratePlanButton from "./GeneratePlanButton";

type PlanView = "kanban" | "gantt";

const BRAND = "#FE9C00";

export default function PlanClient({ workId }: { workId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const view: PlanView = searchParams.get("view") === "gantt" ? "gantt" : "kanban";

  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const planQuery = useQuery({
    queryKey: ["work-plan", workId],
    queryFn: () => getWorkPlan(workId),
  });

  const workforceQuery = useQuery({
    queryKey: ["assignable-workforce"],
    queryFn: () => getAssignableWorkforce(),
    staleTime: 5 * 60 * 1000,
  });

  const tasks: WorkTaskDto[] = useMemo(
    () => planQuery.data?.tasks ?? [],
    [planQuery.data]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["work-plan", workId] });
  }, [queryClient, workId]);

  const setView = useCallback(
    (next: PlanView) => {
      // The view lives in the URL so the back button works and a link can point at a
      // specific view, rather than being restored from storage the reader cannot see.
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", next);
      router.replace(`/tasks/${workId}/plan?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams, workId]
  );

  const aiTaskCount = useMemo(() => {
    const countAi = (list: WorkTaskDto[]): number =>
      list.reduce(
        (sum, task) =>
          sum + (task.aiGenerated ? 1 : 0) + countAi(task.children),
        0
      );
    return countAi(tasks);
  }, [tasks]);

  const loadError = planQuery.isError
    ? "Az ütemterv betöltése nem sikerült. Ellenőrizd a kapcsolatot, és próbáld újra."
    : planQuery.data && !planQuery.data.success
      ? planQuery.data.error
      : null;

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 pb-28">
        <header className="flex items-center gap-3 pt-6">
          <Link
            href={`/tasks/${workId}`}
            aria-label="Vissza a feladatokhoz"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
            style={{ color: BRAND }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Ütemterv</h1>
        </header>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900">
                Az ütemterv most nem érhető el
              </p>
              <p className="mt-1 text-sm text-amber-800">{loadError}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => planQuery.refetch()}
              disabled={planQuery.isFetching}
              className="rounded-md bg-[#FE9C00] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#FE9C00]/90 disabled:opacity-60"
            >
              {planQuery.isFetching ? "Újrapróbálás…" : "Újrapróbálás"}
            </button>
            <Link
              href={`/tasks/${workId}`}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Vissza a feladatokhoz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-28">
      <header className="flex items-center gap-3 px-4 pt-6">
        <Link
          href={`/tasks/${workId}`}
          aria-label="Vissza a feladatokhoz"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          style={{ color: BRAND }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            Ütemterv
          </h1>
          {planQuery.data?.workTitle && (
            <p className="truncate text-xs text-gray-500">
              {planQuery.data.workTitle}
            </p>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 px-4 pt-4">
        <div className="flex rounded-full bg-gray-100 p-1">
          <ViewTab
            active={view === "kanban"}
            onClick={() => setView("kanban")}
            icon={<Columns3 className="h-4 w-4" />}
            label="Kanban"
          />
          <ViewTab
            active={view === "gantt"}
            onClick={() => setView("gantt")}
            icon={<GanttChartSquare className="h-4 w-4" />}
            label="Gantt"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft({ mode: "create", workId, parentId: null })
            }
            className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Feladat
          </button>
          <GeneratePlanButton
            workId={workId}
            existingAiTaskCount={aiTaskCount}
            onGenerated={(message) => {
              toast.success(message);
              refresh();
            }}
          />
        </div>
      </div>

      {planQuery.isLoading ? (
        <PlanSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState />
      ) : view === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onEdit={(task) => setDraft({ mode: "edit", workId, task })}
          onAddSubtask={(parent) =>
            setDraft({ mode: "create", workId, parentId: parent.id })
          }
          onChanged={refresh}
        />
      ) : (
        <GanttChart
          tasks={tasks}
          baseDate={planQuery.data?.workStartDate ?? null}
          onSelect={(task) => setDraft({ mode: "edit", workId, task })}
        />
      )}

      {draft && (
        <TaskEditDialog
          draft={draft}
          workforce={workforceQuery.data?.workforce ?? []}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-6">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-4 mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-900">
        Még nincs ütemterv ehhez a munkához.
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Generáltasd az AI-jal a munka tételeiből, vagy vegyél fel feladatot kézzel.
        Az AI által javasolt ütemterv utána szabadon szerkeszthető.
      </p>
    </div>
  );
}
