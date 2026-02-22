"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientQuoteSession } from "@/actions/client-quote-actions";
import { Sparkles } from "lucide-react";

export default function QuoteRequestPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (description.trim().length < 10) {
      setError("Kérjük írjon legalább 10 karaktert a projekt leírásához.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createClientQuoteSession(description.trim());
      if (result.success && result.sessionId) {
        router.push(`/quote-request/${result.sessionId}`);
      }
    } catch {
      setError("Hiba történt. Kérjük próbálja újra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Új ajánlatkérés</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Illessze be az ajánlatkérést vagy írja le részletesen mire van szüksége
        </p>

        <textarea
          className="w-full h-48 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 placeholder-gray-400 text-sm"
          placeholder="Például: 50m²-es lakás felújítása, burkolással, festéssel és villanyszerelésssel..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          maxLength={2000}
          disabled={isLoading}
        />

        <div className="flex justify-between items-start mt-2 mb-6 gap-4">
          <div className="text-xs text-gray-400 space-y-1">
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <p>• Minden fontos információt írjon le</p>
                <p>• Adja meg a pontos helyszínt</p>
                <p>• Mikorra lenne szüksége a munkákra?</p>
              </>
            )}
          </div>
          <span className="text-xs text-gray-300 flex-shrink-0">
            {description.length}/2000
          </span>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleStart}
            disabled={isLoading || description.trim().length < 10}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? "Indítás..." : "Elemzés indítása"}
          </button>
        </div>
      </div>
    </div>
  );
}
