import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserData } from "@/actions/user-actions";
import PlanClient from "./_components/PlanClient";

/**
 * The AI generation action is bundled into this page's serverless function, so the
 * execution ceiling has to be declared here. It cannot live in the action module:
 * a "use server" file may only export async functions, and a `const` export there
 * breaks the dev server at runtime rather than at typecheck time.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkPlanPage({ params }: Props) {
  const { id } = await params;
  const workId = Number(id);

  if (!Number.isInteger(workId) || workId <= 0) {
    redirect("/works");
  }

  // Server-side guard so a non-tenant never sees the schedule flash before redirecting.
  // The actions re-check this independently — this one is only about the layout.
  const userData = await getCurrentUserData();
  if (!userData.isTenant) {
    redirect(`/tasks/${workId}`);
  }

  // PlanClient reads the active view from the query string, and useSearchParams needs a
  // Suspense boundary above it or the build refuses to compile the route.
  return (
    <Suspense fallback={null}>
      <PlanClient workId={workId} />
    </Suspense>
  );
}
