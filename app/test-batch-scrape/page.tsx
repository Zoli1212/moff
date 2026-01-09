"use client";

import { useState } from "react";

export default function TestBatchScrapePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatchScrape = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First, get the list of workItems that need price check
      const listResponse = await fetch("/api/materials?needsPriceCheck=true");

      if (!listResponse.ok) {
        throw new Error("Failed to fetch workItems list");
      }

      const { materials } = await listResponse.json();

      if (!materials || materials.length === 0) {
        setResult({
          success: true,
          results: { total: 0, success: 0, failed: 0 },
          message: "Nincs frissítendő tétel",
        });
        return;
      }

      const results = {
        total: materials.length,
        success: 0,
        failed: 0,
        errors: [] as Array<{ workItemId: number; name: string; error: string }>,
      };

      // Process each workItem sequentially (like the manual version)
      for (const material of materials) {
        try {
          console.log(`🔄 Processing workItem ${material.workItemId}: ${material.name}`);

          const response = await fetch("/api/scrape-material-prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workItemId: material.workItemId,
              forceRefresh: false,
              materialName: material.name,
            }),
          });

          if (response.ok) {
            results.success++;
            console.log(`✅ Success for workItem ${material.workItemId}`);
          } else {
            results.failed++;
            const errorData = await response.json();
            results.errors.push({
              workItemId: material.workItemId,
              name: material.name,
              error: errorData.error || `HTTP ${response.status}`,
            });
            console.log(`❌ Failed for workItem ${material.workItemId}`);
          }

          // Update UI with current progress
          setResult({
            success: true,
            results,
            message: `Frissítve ${results.success}/${results.total} tétel (${results.failed} sikertelen)`,
          });

          // Small delay to avoid rate limiting (like manual version)
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (err) {
          results.failed++;
          results.errors.push({
            workItemId: material.workItemId,
            name: material.name,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      // Final summary
      const finalMessage = `
🎉 Batch Scraping Befejezve!

📊 Összesítés:
- Összes tétel: ${results.total}
- ✅ Sikeres: ${results.success}
- ❌ Sikertelen: ${results.failed}
- 📈 Sikerességi arány: ${Math.round((results.success / results.total) * 100)}%
      `.trim();

      console.log(finalMessage);

      setResult({
        success: true,
        results,
        message: `Kész! Frissítve ${results.success}/${results.total} tétel`,
        summary: finalMessage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Batch Price Scraping Tesztelő</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleRunBatchScrape}
            disabled={loading}
            className="px-6 py-3 bg-[#FF9900] hover:bg-[#e68a00] disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Futtatás..." : "Batch Scraping Indítása"}
          </button>

          {loading && (
            <div className="mt-4 text-gray-600">
              ⏳ Kérlek várj, az árakat ellenőrizzük az összes anyagra...
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
            <h2 className="text-lg font-semibold text-green-800 mb-4">✅ Eredmény</h2>

            {/* Summary box - only shown when batch is complete */}
            {result.summary && !loading && (
              <div className="bg-white border-2 border-green-400 rounded-lg p-4 mb-6">
                <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                  {result.summary}
                </pre>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="text-sm">
                <span className="font-medium">Üzenet:</span> {result.message}
              </div>
              {result.results && (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Összes tétel:</span> {result.results.total}
                  </div>
                  <div className="text-sm text-green-700">
                    <span className="font-medium">Sikeres:</span> {result.results.success}
                  </div>
                  <div className="text-sm text-red-700">
                    <span className="font-medium">Sikertelen:</span> {result.results.failed}
                  </div>
                  {result.results.total > 0 && (
                    <div className="text-sm text-blue-700">
                      <span className="font-medium">Sikerességi arány:</span> {Math.round((result.results.success / result.results.total) * 100)}%
                    </div>
                  )}
                </>
              )}
            </div>

            {result.results?.errors && result.results.errors.length > 0 && (
              <details className="mt-4 mb-4">
                <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-900">
                  Hibák megtekintése ({result.results.errors.length})
                </summary>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {result.results.errors.map((err: any, idx: number) => (
                    <div key={idx} className="p-2 bg-red-50 rounded text-xs">
                      <div className="font-medium">#{err.workItemId} - {err.name}</div>
                      <div className="text-red-600">{err.error}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Teljes JSON válasz
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
