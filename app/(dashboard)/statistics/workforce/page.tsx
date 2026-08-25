import { Suspense } from "react";
import WorkforceRankingClient from "./_components/WorkforceRankingClient";

export const dynamic = "force-dynamic";

export default function WorkforceRankingPage() {
  return (
    <Suspense fallback={null}>
      <WorkforceRankingClient />
    </Suspense>
  );
}
