import { Suspense } from "react";
import RAGSyncComponent from "./_components/RAGSyncComponent";

interface OtherPageProps {
  params: {
    id: string;
  };
}

export default function OtherPage({ params }: OtherPageProps) {
  const workId = parseInt(params.id);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Technical Operations</h1>
      
      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">RAG Synchronization</h2>
          <p className="text-gray-600 mb-4">
            Synchronize all work item progress with the latest diary entries.
          </p>
          
          <Suspense fallback={<div>Loading...</div>}>
            <RAGSyncComponent workId={workId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
