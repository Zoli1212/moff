import DemandUploadDialog from "@/app/(routes)/dashboard/_components/DemandUploadDialog";
import { Button } from "@/components/ui/button";
import { Sparkle } from "lucide-react";
import React, { useState } from "react";

function filterRelevant(arr?: string[]) {
  if (!arr) return [];
  return arr.filter(
    (item) =>
      item &&
      item !== "not specified" &&
      item !== "implied" &&
      item.trim() !== ""
  );
}

function filterValue(val?: string) {
  return val && val !== "not specified" && val !== "implied" && val.trim() !== "" ? val : "-";
}

function Report({ aiReport }: any) {
  const [openDemandUpload, setOpenDemandUpload] = useState(false);

  // Előfeldolgozott, szűrt adatok
  const requirements = filterRelevant(aiReport?.requirements);
  const clientPriorities = filterRelevant(aiReport?.client_priorities);
  const mustHaves = filterRelevant(aiReport?.must_haves);
  const niceToHaves = filterRelevant(aiReport?.nice_to_haves);
  const constraints = filterRelevant(aiReport?.constraints);
  const risksOrDependencies = filterRelevant(aiReport?.risks_or_dependencies);
  const missingInfo = filterRelevant(aiReport?.missing_info);

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800 gradient-component-text">
          Felújítási igény AI elemzés
        </h2>
        <Button type="button" onClick={() => setOpenDemandUpload(true)}>
          Újraelemzés <Sparkle />
        </Button>
      </div>

      {/* Project Main Info */}
      <div className="bg-gradient-to-r from-[#BE575F] via-[#A338E3] to-[#AC76D6] rounded-lg shadow-md p-6 mb-6 border border-blue-200">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center">
          <i className="fas fa-home text-yellow-400 mr-2"></i> Projekt fő adatai
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
          <div><b>Projekt típusa:</b> {filterValue(aiReport?.project_type)}</div>
          <div><b>Felújítás jellege:</b> {filterValue(aiReport?.scope)}</div>
          <div><b>Ingatlan típusa:</b> {filterValue(aiReport?.property_type)}</div>
          <div><b>Helyszín:</b> {filterValue(aiReport?.location)}</div>
          <div><b>Alapterület (m²):</b> {filterValue(aiReport?.area_sqm)}</div>
          <div><b>Érintett helyiségek:</b> {(aiReport?.rooms_affected && filterRelevant(aiReport.rooms_affected).length > 0) ? filterRelevant(aiReport.rooms_affected).join(', ') : '-'}</div>
          <div><b>Költségkeret:</b> {filterValue(aiReport?.budget_estimate)}</div>
          <div><b>Ütemezés:</b> {filterValue(aiReport?.timeline)}</div>
          <div><b>Fázisok:</b> {filterValue(aiReport?.phasing)}</div>
        </div>
      </div>

      {/* Requirements & Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5 border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-list-alt text-blue-400 mr-2"></i> Követelmények
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {requirements.length > 0
              ? requirements.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border border-green-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-star text-green-400 mr-2"></i> Ügyfél prioritások
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {clientPriorities.length > 0
              ? clientPriorities.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
      </div>

      {/* Must/Nice to Have */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5 border border-yellow-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-check-circle text-yellow-400 mr-2"></i> Kötelező elemek
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {mustHaves.length > 0
              ? mustHaves.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border border-purple-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-heart text-purple-400 mr-2"></i> Opcionális elemek
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {niceToHaves.length > 0
              ? niceToHaves.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
      </div>

      {/* Constraints & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-ban text-gray-400 mr-2"></i> Korlátozások
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {constraints.length > 0
              ? constraints.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border border-red-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-exclamation-triangle text-red-400 mr-2"></i> Kockázatok / Függőségek
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {risksOrDependencies.length > 0
              ? risksOrDependencies.map((item: string, i: number) => <li key={i}>{item}</li>)
              : <li>-</li>}
          </ul>
        </div>
      </div>

      {/* Missing Info */}
      <div className="bg-yellow-100 rounded-lg shadow-md p-5 border-l-8 border-yellow-400 mb-6">
        <h4 className="text-lg font-bold text-yellow-700 mb-2 flex items-center">
          <i className="fas fa-question-circle mr-2"></i> Hiányzó vagy pontosítandó információk
        </h4>
        <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
          {missingInfo.length > 0
            ? missingInfo.map((item: string, i: number) => <li key={i}>{item}</li>)
            : <li>Nincs megadva vagy minden szükséges információ rendelkezésre áll.</li>}
        </ul>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg shadow-md p-5 border-l-8 border-blue-400 mb-6">
        <h4 className="text-lg font-bold text-blue-700 mb-2 flex items-center">
          <i className="fas fa-info-circle mr-2"></i> Összefoglaló
        </h4>
        <p className="text-blue-900 text-base">{aiReport?.summary_comment || '-'}</p>
      </div>

      {/* Proposal section */}
      {aiReport?.proposal && (
        <div className="mt-8 mb-8 p-6 rounded-lg border border-blue-200 bg-blue-50 shadow-sm">
          <h3 className="text-2xl font-extrabold mb-6 text-blue-900 text-center tracking-wide">Ajánlat</h3>
          {typeof aiReport.proposal === 'object' && aiReport.proposal !== null ? (
            <div className="space-y-6">
              {/* Feltételezések */}
              {aiReport.proposal.assumptions && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800 border-b pb-1">Feltételezések</h4>
                  <ul className="list-disc list-inside text-blue-900 text-sm">
                    {aiReport.proposal.assumptions.map((a: string, idx: number) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Munkafázisok */}
              {aiReport.proposal.main_work_phases && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800 border-b pb-1">Főbb munkafázisok</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiReport.proposal.main_work_phases.map((phase: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg shadow p-4 border border-blue-100">
                        <h5 className="font-bold text-blue-700 mb-1">{phase.phase}</h5>
                        <div className="mb-2 text-xs text-blue-500">{phase.timeline} &bull; <span className="font-semibold">{phase.estimated_cost}</span></div>
                        <ul className="list-disc list-inside text-blue-900 text-sm mb-2">
                          {phase.tasks && phase.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
                        </ul>
                        {phase.notes && <div className="text-xs text-blue-700 italic">{phase.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Időzítés */}
              {aiReport.proposal.timeline_details && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800 border-b pb-1">Időzítés, ütemezés</h4>
                  <p className="text-blue-900 text-sm">{aiReport.proposal.timeline_details}</p>
                </div>
              )}

              {/* Becsült költségek */}
              {aiReport.proposal.estimated_total_cost && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800 border-b pb-1">Becsült teljes költség</h4>
                  <div className="text-blue-900 text-lg font-bold">{aiReport.proposal.estimated_total_cost}</div>
                </div>
              )}

              {/* Megjegyzések */}
              {aiReport.proposal.implementation_notes && (
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800 border-b pb-1">Megjegyzések, javaslatok</h4>
                  <ul className="list-disc list-inside text-blue-900 text-sm">
                    {aiReport.proposal.implementation_notes.map((n: string, idx: number) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-blue-800 text-sm">{aiReport.proposal}</pre>
          )}
        </div>
      )}

      {/* JSON Riport megjelenítése */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">JSON Riport (nyers visszatérési érték):</h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
          {JSON.stringify(aiReport, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default Report;
