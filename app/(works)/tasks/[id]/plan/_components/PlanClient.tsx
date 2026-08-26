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
import type {
  WorkTaskDependencyDto,
  WorkTaskDto,
} from "@/lib/work-plan/schema";
import { useLocale } from "@/components/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import KanbanBoard from "./KanbanBoard";
import GanttChart from "./GanttChart";
import TaskEditDialog, { type TaskDraft } from "./TaskEditDialog";
import GeneratePlanButton from "./GeneratePlanButton";

type PlanView = "kanban" | "gantt";

const BRAND = "#FE9C00";

export default function PlanClient({ workId }: { workId: number }) {
  const { t } = useLocale();
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

  const dependencies: WorkTaskDependencyDto[] = useMemo(
    () => planQuery.data?.dependencies ?? [],
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
    ? t("plan.unavailable")
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
          <h1 className="text-lg font-semibold text-gray-900">{t("plan.title")}</h1>
        </header>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900">
                {t("plan.unavailable")}
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
              {t("plan.retry")}
            </button>
            <Link
              href={`/tasks/${workId}`}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              {t("plan.backToTasks")}
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
            {t("plan.title")}
          </h1>
          {planQuery.data?.workTitle && (
            <p className="truncate text-xs text-gray-500">
              {planQuery.data.workTitle}
            </p>
          )}
        </div>
        <LocaleSwitcher className="shrink-0" />
      </header>

      {/*
        Wraps on narrow screens: the view toggle takes the first line and the actions
        drop to a second, right-aligned line. Forcing all four controls onto one row is
        what made the "AI ütemterv" label break across two lines on a phone.
      */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <div className="flex shrink-0 rounded-full bg-gray-100 p-1">
          <ViewTab
            active={view === "kanban"}
            onClick={() => setView("kanban")}
            icon={<Columns3 className="h-4 w-4" />}
            label={t("plan.kanban")}
          />
          <ViewTab
            active={view === "gantt"}
            onClick={() => setView("gantt")}
            icon={<GanttChartSquare className="h-4 w-4" />}
            label={t("plan.gantt")}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft({ mode: "create", workId, parentId: null })
            }
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            {t("plan.newTask")}
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
          dependencies={dependencies}
          baseDate={planQuery.data?.workStartDate ?? null}
          onSelect={(task) => setDraft({ mode: "edit", workId, task })}
        />
      )}

      {draft && (
        <TaskEditDialog
          draft={draft}
          workforce={workforceQuery.data?.workforce ?? []}
          allTasks={tasks}
          dependencies={dependencies}
          onDependencyChanged={refresh}
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
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
  const { t } = useLocale();
  return (
    <div className="mx-4 mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-900">
        {t("plan.empty")}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        {t("plan.emptyHint")}
      </p>
    </div>
  );
}
