"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { syncRAGProgress } from "@/actions/rag-actions";

interface RAGSyncComponentProps {
  workId: number;
}

interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  resetCount?: number;
}

export default function RAGSyncComponent({ workId }: RAGSyncComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const syncResult = await syncRAGProgress(workId);
      setResult(syncResult);
    } catch (error) {
      console.error("Error during synchronization:", error);
      setResult({
        success: false,
        message: "An error occurred during synchronization"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSync}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? "Synchronizing..." : "RAG Synchronization"}
      </Button>

      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span className="font-medium">
              {result.success ? "Success" : "Error"}
            </span>
          </div>
          
          <p className="mt-2">{result.message}</p>
          
          {result.success && (result.syncedCount || result.resetCount) && (
            <div className="mt-2 text-sm">
              {result.syncedCount && (
                <div>• Synchronized: {result.syncedCount} work items</div>
              )}
              {result.resetCount && (
                <div>• Reset to 0: {result.resetCount} work items</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
