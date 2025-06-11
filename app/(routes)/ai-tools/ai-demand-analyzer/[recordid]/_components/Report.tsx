import { Button } from "@/components/ui/button";
import { Sparkle } from "lucide-react";
import React from "react";
import { usePDF } from "react-to-pdf";
import Link from "next/link";
import { Cost, Phase, Proposal } from "@/types/proposal";

function filterRelevant(arr?: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (item): item is string =>
      typeof item === "string" &&
      item !== "not specified" &&
      item !== "implied" &&
      item.trim() !== ""
  );
}

function filterValue(val?: string) {
  return val &&
    val !== "not specified" &&
    val !== "implied" &&
    val.trim() !== ""
    ? val
    : "-";
}



function Report({
  aiReport,
}: {
  aiReport: { proposal?: Proposal; [key: string]: unknown };
}) {
  // Előfeldolgozott, szűrt adatok (proposal alá helyezve)
  const requirements = filterRelevant(aiReport?.proposal?.requirements);
  const clientPriorities = filterRelevant(
    aiReport?.proposal?.client_priorities
  );
  const mustHaves = filterRelevant(aiReport?.proposal?.must_haves);
  const niceToHaves = filterRelevant(aiReport?.proposal?.nice_to_haves);
  const constraints = filterRelevant(aiReport?.proposal?.constraints);
  const risksOrDependencies = filterRelevant(
    aiReport?.proposal?.risks_or_dependencies
  );
  const missingInfo = filterRelevant(aiReport?.proposal?.missing_info);
  const { targetRef } = usePDF({
    filename: "ajanlat.pdf",
    resolution: 4,
    method: "save",
    page: {
      format: "a4",
      orientation: "portrait",
      margin: 0,
    },
    canvas: {
      mimeType: "image/jpeg",
      qualityRatio: 1,
    },
    overrides: {
      canvas: {
        useCORS: true,
      },
    },
  });

  return (
    <div className="pdf-content w-full max-w-[800px] mx-auto text-black whitespace-pre-line break-words p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800 gradient-component-text">
          Felújítási igény AI elemzés
        </h2>
        <Button type="button" disabled>
          Újraelemzés <Sparkle />
        </Button>
      </div>

      {/* Project Main Info */}
      <div className="bg-gradient-to-r from-[#6b166b] via-[#7c1e7c] to-[#8d269d] rounded-lg shadow-md p-6 mb-6 border border-purple-900">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-home text-yellow-400 mr-2"></i> Projekt fő adatai
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
          <div>
            <span className="font-semibold">Projekt típusa:</span>{" "}
            {typeof aiReport?.project_type === "string"
              ? filterValue(aiReport?.project_type)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Felújítás jellege:</span>{" "}
            {typeof aiReport?.scope === "string"
              ? filterValue(aiReport?.scope)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Ingatlan típusa:</span>{" "}
            {typeof aiReport?.property_type === "string"
              ? filterValue(aiReport?.property_type)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Ingatlan mérete: </span>
            {typeof aiReport?.area_sqm === "string" ||
            typeof aiReport?.area_sqm === "number"
              ? `${filterValue(String(aiReport.area_sqm))} m2`
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Cím:</span>{" "}
            {typeof aiReport?.location === "string"
              ? filterValue(aiReport?.location)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Költségkeret:</span>{" "}
            {typeof aiReport?.budget_estimate === "string"
              ? filterValue(aiReport?.budget_estimate)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Ütemezés:</span>{" "}
            {typeof aiReport?.timeline === "string"
              ? filterValue(aiReport?.timeline)
              : "-"}
          </div>
          <div>
            <span className="font-semibold">Fázisok:</span>{" "}
            {typeof aiReport?.phasing === "string"
              ? filterValue(aiReport?.phasing)
              : "-"}
          </div>
        </div>
      </div>
      {/* Requirements & Priorities */}
      {/* Requirements & Priorities */}
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5 border border-blue-200 min-w-[280px] max-w-full flex-1">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-list-alt text-blue-400 mr-2"></i> Követelmények
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {requirements.length > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {requirements.map((item, idx) => (
                  <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                ))}
              </ul>
            ) : (
              "-"
            )}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border border-green-200 min-w-[280px] max-w-full flex-1">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            <i className="fas fa-star text-green-400 mr-2"></i> Ügyfél
            prioritások
          </h4>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
            {clientPriorities.length > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {clientPriorities.map((item, idx) => (
                  <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                ))}
              </ul>
            ) : (
              "-"
            )}
          </ul>
        </div>
      </div>
      {/* Must/Nice to Have */}
      <div className="flex flex-wrap gap-6 mb-6">
        {mustHaves.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border border-yellow-200 min-w-[280px] max-w-full flex-1">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              <i className="fas fa-check-circle text-yellow-400 mr-2"></i>{" "}
              Kötelező elemek
            </h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {mustHaves.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {mustHaves.map((item, idx) => (
                    <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                  ))}
                </ul>
              ) : (
                "-"
              )}
            </ul>
          </div>
        )}
        {niceToHaves.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border border-orange-200 min-w-[280px] max-w-full flex-1">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              <i className="fas fa-thumbs-up text-orange-400 mr-2"></i> Jó, ha
              van
            </h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {niceToHaves.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {niceToHaves.map((item, idx) => (
                    <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                  ))}
                </ul>
              ) : (
                "-"
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Constraints, Risks, Missing Info */}
      <div className="flex flex-wrap gap-6 mb-6">
        {constraints.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border border-red-200 min-w-[280px] max-w-full flex-1">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              <i className="fas fa-exclamation-triangle text-red-400 mr-2"></i>{" "}
              Korlátozások
            </h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {constraints.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {constraints.map((item, idx) => (
                    <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                  ))}
                </ul>
              ) : (
                "-"
              )}
            </ul>
          </div>
        )}
        {risksOrDependencies.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border border-pink-200 min-w-[280px] max-w-full flex-1">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              <i className="fas fa-bolt text-pink-400 mr-2"></i> Kockázatok,
              függőségek
            </h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {risksOrDependencies.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {risksOrDependencies.map((item, idx) => (
                    <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                  ))}
                </ul>
              ) : (
                "-"
              )}
            </ul>
          </div>
        )}
        {missingInfo.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 min-w-[280px] max-w-full flex-1">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              <i className="fas fa-question-circle text-gray-400 mr-2"></i>{" "}
              Hiányzó információk
            </h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {missingInfo.length > 0 ? (
                <ul className="list-disc list-inside ml-4">
                  {missingInfo.map((item, idx) => (
                    <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                  ))}
                </ul>
              ) : (
                "-"
              )}
            </ul>
          </div>
        )}
      </div>
      {/* Summary */}
      <div className="bg-blue-50 rounded-lg shadow-md p-5 border-l-8 border-blue-400 mb-6">
        <h4 className="text-lg font-bold text-black mb-1 flex items-center">
          <i className="fas fa-info-circle mr-2"></i> Összefoglaló
        </h4>
        <p className="text-black text-base">
          {typeof aiReport?.proposal?.summary_comment === "string"
            ? aiReport?.proposal?.summary_comment
            : "-"}
        </p>
      </div>

      {aiReport?.proposal && (
        <div className="mb-4 flex justify-end">
          <Link
            href={{
              pathname: "/proposal-preview",
              query: { proposal: JSON.stringify(aiReport.proposal) },
            }}
            passHref
          >
            <Button variant="secondary">Ajánlat előnézet & PDF letöltés</Button>
          </Link>
        </div>
      )}

      {aiReport?.proposal && (
        <div
          ref={targetRef}
          className="mt-8 mb-8 p-6 rounded border border-gray-300 bg-white"
        >
          <h3 className="text-2xl font-extrabold mb-2 text-black text-center tracking-wide">
            Ajánlat{" "}
            {typeof aiReport?.proposal?.customer_name === "string"
              ? aiReport?.proposal.customer_name
              : ""}
          </h3>
          {typeof aiReport?.proposal?.company_name === "string" && (
            <div className="text-base font-bold text-black text-center mb-4">
              {aiReport.proposal.company_name}
            </div>
          )}
          {typeof aiReport.proposal === "object" &&
          aiReport.proposal !== null ? (
            <div className="space-y-6">
              {/* Összegzés */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <b>Nettó összeg:</b>{" "}
                  {typeof aiReport.proposal.total_net_amount === "string" ||
                  typeof aiReport.proposal.total_net_amount === "number"
                    ? aiReport.proposal.total_net_amount
                    : "-"}
                </div>
                <div>
                  <b>ÁFA összege:</b>{" "}
                  {typeof aiReport.proposal.vat_amount === "string" ||
                  typeof aiReport.proposal.vat_amount === "number"
                    ? aiReport.proposal.vat_amount
                    : "-"}
                </div>
                <div>
                  <b>Bruttó összeg:</b>{" "}
                  {typeof aiReport.proposal.total_gross_amount === "string" ||
                  typeof aiReport.proposal.total_gross_amount === "number"
                    ? aiReport.proposal.total_gross_amount
                    : "-"}
                </div>
                <div>
                  <b>Végső határidő:</b>{" "}
                  {typeof aiReport.proposal.final_deadline === "string"
                    ? aiReport.proposal.final_deadline
                    : "-"}
                </div>
              </div>

              {/* Munkafázisok */}
              <div>
                <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">
                  Főbb munkafázisok
                </h4>
                {Array.isArray(aiReport.proposal.main_work_phases_and_tasks) &&
                aiReport.proposal.main_work_phases_and_tasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiReport.proposal.main_work_phases_and_tasks.map(  
                      (phase: Phase, idx: number) => (
                        <div
                          key={idx}
                          className="bg-white rounded p-4 border border-gray-300"
                        >
                          <h5 className="font-bold text-black mb-1">
                            {typeof phase === "string"
                              ? phase
                              : "-"}
                          </h5>
                          <ul className="list-disc list-inside text-black text-sm mb-2">
                            {Array.isArray(phase.tasks)
                              ? phase.tasks.map((t: string, i: number) => (
                                  <li key={i}>
                                    {typeof t === "string" ? t : "-"}
                                  </li>
                                ))
                              : null}
                          </ul>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </div>
              {/* Ütemezés */}
              <div>
                <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">
                  Időzítés, ütemezés
                </h4>
                {Array.isArray(
                  aiReport.proposal.timeline_and_scheduling_details
                ) &&
                aiReport.proposal.timeline_and_scheduling_details.length > 0 ? (
                  <ul className="list-disc list-inside text-black text-sm">
                    {aiReport.proposal.timeline_and_scheduling_details.map(
                      (item: string, idx: number) => (
                        <li key={idx}>
                          {typeof item === "string" ? item : "-"}
                        </li>
                      )
                    )}
                  </ul>
                ) : typeof aiReport.proposal.timeline_and_scheduling_details ===
                    "string" &&
                  aiReport.proposal.timeline_and_scheduling_details.trim() !==
                    "" ? (
                  <div className="text-black text-sm">
                    {aiReport.proposal.timeline_and_scheduling_details}
                  </div>
                ) : (
                  "-"
                )}
              </div>
              {/* Költségek bontása */}
              <div>
                <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">
                  Költségek bontása
                </h4>
                {Array.isArray(
                  aiReport?.proposal?.estimated_costs_per_phase_and_total
                ) &&
                aiReport.proposal.estimated_costs_per_phase_and_total.length >
                  0 ? (
                  <ul className="list-disc list-inside text-black text-sm">
                    {aiReport.proposal.estimated_costs_per_phase_and_total.map(
                      (item: Cost, idx: number) => {
                        // Megkeressük a taskokat ehhez a fázishoz
                        const phaseObj = Array.isArray(
                          aiReport?.proposal?.main_work_phases_and_tasks
                        )
                          ? aiReport.proposal.main_work_phases_and_tasks.find(
                              (p: Phase) => p.phase === item.phase
                            )
                          : undefined;
                        const tasks = phaseObj?.tasks;

                        return (
                          <li key={item.phase || idx} className="mb-2">
                            <b>
                              {typeof item.phase === "string"
                                ? item.phase === "Total" ? "Összesen" : item.phase
                                : "-"}
                              :
                            </b>{" "}
                            {typeof item.cost === "string" ||
                            typeof item.cost === "number"
                              ? item.cost
                              : "-"}
                            {Array.isArray(tasks) && tasks.length > 0 && (
                              <ul className="list-disc list-inside ml-4 text-gray-700">
                                {Array.isArray(tasks)
                                  ? tasks.map((task: string, tIdx: number) => (
                                      <li key={tIdx}>
                                        {typeof task === "string" ? task : "-"}
                                      </li>
                                    ))
                                  : null}
                              </ul>
                            )}
                          </li>
                        );
                      }
                    )}
                  </ul>
                ) : (
                  "-"
                )}
              </div>
              {/* Megjegyzések, javaslatok */}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-black text-sm">
              {typeof aiReport?.proposal === "string" ? aiReport.proposal : "-"}
            </pre>
          )}
        </div>
      )}

      {(() => {
        const notes =
          aiReport?.proposal?.relevant_implementation_notes_or_recommendations;
        if (
          !notes ||
          (Array.isArray(notes) && notes.length === 0) ||
          (typeof notes === "string" && notes.trim() === "")
        )
          return null;
        return (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">
              Megjegyzések, javaslatok
            </h4>
            {Array.isArray(notes) ? (
              <ul className="list-disc list-inside text-black text-sm">
                {notes.map((item: unknown, idx: number) => (
                  <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                ))}
              </ul>
            ) : (
              <div className="text-black text-sm">
                {typeof notes === "string" ? notes : "-"}
              </div>
            )}
          </div>
        );
      })()}

      {(() => {
        const assumptions = aiReport?.proposal?.assumptions_made;
        if (
          !assumptions ||
          (Array.isArray(assumptions) && assumptions.length === 0) ||
          (typeof assumptions === "string" && assumptions.trim() === "")
        )
          return null;
        return (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">
              Feltételezések
            </h4>
            {Array.isArray(assumptions) ? (
              <ul className="list-disc list-inside text-black text-sm">
                {assumptions.map((item: unknown, idx: number) => (
                  <li key={idx}>{typeof item === "string" ? item : "-"}</li>
                ))}
              </ul>
            ) : (
              <div className="text-black text-sm">
                {typeof assumptions === "string" ? assumptions : "-"}
              </div>
            )}
          </div>
        );
      })()}

      {/* JSON Riport megjelenítése */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">
          JSON Riport (nyers visszatérési érték):
        </h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
          {JSON.stringify(aiReport, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default Report;
