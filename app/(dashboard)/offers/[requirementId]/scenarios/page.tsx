import { Suspense } from "react";
import { redirect } from "next/navigation";
import ScenariosClient from "./_components/ScenariosClient";

/**
 * The analysis action is bundled into this page's serverless function, so the execution
 * ceiling belongs here. It cannot live in the action module: a "use server" file may
 * only export async functions.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ requirementId: string }>;
  searchParams: Promise<{ offerId?: string }>;
}

export default async function OfferScenariosPage({ params, searchParams }: Props) {
  const { requirementId } = await params;
  const { offerId } = await searchParams;

  const parsedOfferId = Number(offerId);
  if (!Number.isInteger(parsedOfferId) || parsedOfferId <= 0) {
    redirect(`/offers/${requirementId}`);
  }

  return (
    <Suspense fallback={null}>
      <ScenariosClient
        offerId={parsedOfferId}
        requirementId={requirementId}
      />
    </Suspense>
  );
}
