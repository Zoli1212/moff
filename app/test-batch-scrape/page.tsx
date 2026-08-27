"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface BatchScrapeResult {
  success: boolean;
  message: string;
  tenantEmail?: string;
  duration?: string;
  results?: {
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ materialId: number; name: string; error: string }>;
  };
}

export default function TestBatchScrapePage() {
  const { t } = useLocale();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatchScrape = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("🚀 Starting batch scraping via /api/scrape-materials-batch");

      const startTime = Date.now();

      // Call the new batch endpoint (GET)
      const response = await fetch("/api/scrape-materials-batch", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BatchScrapeResult = await response.json();
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      console.log("✅ Batch scraping complete:", data);
      console.log(`⏱️ Duration: ${duration}s`);

      setResult({ ...data, duration });
    } catch (err) {
      console.error("❌ Error running batch scrape:", err);
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Material Batch Scraping Tesztelő</h1>

        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Új batch scraping endpoint:</strong> <code>/api/scrape-materials-batch</code>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Ez az endpoint az összes Material táblában lévő anyagot scrapelje. Teljesen független a WorkItem alapú scraping-től.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            <strong>{t("x.cronSchedule")}</strong> Minden reggel 6:00-kor automatikusan (UTC)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleRunBatchScrape}
            disabled={loading}
            className="px-6 py-3 bg-[#FF9900] hover:bg-[#e68a00] disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? t("x.running") : "Material Batch Scraping Indítása"}
          </button>

          {loading && (
            <div className="mt-4">
              <div className="flex items-center gap-3 text-gray-600 mb-2">
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-orange-500 rounded-full"></div>
                <span>⏳ Árakat ellenőrzöm az összes Material tételre...</span>
              </div>
              <div className="text-xs text-gray-500">
                {t("x.mayTakeAWhileMaterial")}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">❌ Hiba</h2>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">✅ Batch Scraping Kész!</h2>

            {/* Summary Stats */}
            {result.results && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{result.results.total}</div>
                  <div className="text-xs text-gray-600">{t("x.allMaterials")}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{result.results.success}</div>
                  <div className="text-xs text-gray-600">Sikeres</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-2xl font-bold text-red-600">{result.results.failed}</div>
                  <div className="text-xs text-gray-600">Sikertelen</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((result.results.success / result.results.total) * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">{t("x.successRate")}</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {result.results && result.results.total > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{t("x.progress")}</span>
                  <span>{result.results.success + result.results.failed}/{result.results.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="flex h-full">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(result.results.success / result.results.total) * 100}%` }}
                    ></div>
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(result.results.failed / result.results.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4 bg-white rounded-lg p-4">
              <div className="text-sm">
                <span className="font-medium">{t("x.message")}</span> {result.message}
              </div>
              {result.tenantEmail && (
                <div className="text-sm">
                  <span className="font-medium">Tenant:</span> {result.tenantEmail}
                </div>
              )}
              {result.duration && (
                <div className="text-sm text-purple-700">
                  <span className="font-medium">⏱️ Futási idő:</span> {result.duration}s
                </div>
              )}
            </div>

            {result.results?.errors && result.results.errors.length > 0 && (
              <details className="mt-4 mb-4">
                <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-900">
                  Hibák megtekintése ({result.results.errors.length})
                </summary>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {result.results.errors.map((err, idx) => (
                    <div key={idx} className="p-2 bg-red-50 rounded text-xs">
                      <div className="font-medium">Material #{err.materialId} - {err.name}</div>
                      <div className="text-red-600">{err.error}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                {t("x.fullJsonResponse")}
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
