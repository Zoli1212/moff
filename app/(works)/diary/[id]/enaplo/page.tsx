import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getWorkDiariesByWorkId } from "@/actions/get-workdiariesbyworkid-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import { getWorkerRestrictionStatus } from "@/actions/workforce-registry-actions";
import { notFound, redirect } from "next/navigation";
import {
  buildDailyReports,
  type EnaploWorkerLookup,
} from "@/lib/enaplo/daily-report";
import EnaploExportClient from "./EnaploExportClient";

interface EnaploPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnaploPage({ params }: EnaploPageProps) {
  const workId = Number((await params).id);
  if (!workId) return notFound();

  // Same gate as the diary itself: a restricted worker has no business exporting the
  // whole site's daily record.
  const userData = await getCurrentUserData();
  const isTenant = userData.isTenant ?? true;
  if (!isTenant) {
    const restrictionStatus = await getWorkerRestrictionStatus();
    if (restrictionStatus.isRestricted) redirect(`/works/${workId}`);
  }

  const [work, items, diaries] = await Promise.all([
    getWorkById(workId),
    getWorkItemsWithWorkers(workId),
    getWorkDiariesByWorkId(workId),
  ]);

  if (!work) return notFound();

  // Diary rows carry a name snapshot but no role, and the form wants the headcount
  // broken down, so the roles are pulled from the work's own worker list.
  const workerLookup: EnaploWorkerLookup = {};
  for (const item of items) {
    for (const worker of item.workers ?? []) {
      if (worker?.id == null) continue;
      workerLookup[worker.id] = { name: worker.name, role: worker.role };
    }
  }

  const reports = buildDailyReports(diaries, workerLookup);

  return (
    <EnaploExportClient
      workId={workId}
      workTitle={work.title ?? ""}
      location={work.location ?? ""}
      reports={reports}
    />
  );
}
