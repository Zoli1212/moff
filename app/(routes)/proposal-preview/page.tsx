"use client";
import { useSearchParams, useRouter } from "next/navigation";

import { usePDF, Resolution } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import ProposalPreview from "./ProposalPreview";
import EmailSender from "@/components/email-sender/EmailSender";

export default function ProposalPreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  let proposal = null;
  try {
    proposal = searchParams.get("proposal") ? JSON.parse(searchParams.get("proposal")!) : null;
  } catch {
    proposal = null;
  }

  const { toPDF, targetRef } = usePDF({
    filename: "ajanlat.pdf",
    resolution: Resolution.HIGH,
    method: "save",
    page: {
      format: "a4",
      orientation: "portrait",
      margin: 12,
    },
    canvas: {
      mimeType: "image/jpeg",
      qualityRatio: 1,
    },
    overrides: {
      canvas: { useCORS: true },
    },
  });

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="w-full max-w-6xl">
        <div className="flex flex-row items-center justify-between ml-2 mb-8 gap-4">
  <div className="flex flex-row gap-4">
    <Button variant="outline" onClick={() => router.back()}>Vissza</Button>
    <Button onClick={() => toPDF()}>PDF letöltése</Button>
  </div>
  <EmailSender email={proposal.customer_email}/>
</div>
        <div ref={targetRef} className="w-full bg-white p-8 shadow mb-8">
          <ProposalPreview proposal={proposal} />
        </div>
        <h3 className="text-lg font-semibold mb-2">JSON Riport (nyers adat):</h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
          {proposal ? JSON.stringify(proposal, null, 2) : "Nincs adat"}
        </pre>
      </div>
    </div>
  );
}