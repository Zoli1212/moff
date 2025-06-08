import React from "react";

export default function ProposalPreview({ proposal }: { proposal: any }) {
  if (!proposal) return null;
  return (
    <div className="w-full max-w-3xl mx-auto bg-white p-8 text-black">
      <h3 className="text-2xl font-extrabold mb-2 text-black text-center tracking-wide">
        Ajánlat {proposal.customer_name ? `${proposal.customer_name} részére` : ""}
      </h3>
      {proposal.company_name && (
        <div className="text-base font-bold text-black text-center mb-4">
          {proposal.company_name}
        </div>
      )}
      <div className="space-y-6">
        {/* Összegzés */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <b>Nettó összeg:</b> {proposal.total_net_amount ?? "-"}
          </div>
          <div>
            <b>ÁFA összege:</b> {proposal.vat_amount ?? "-"}
          </div>
          <div>
            <b>Bruttó összeg:</b> {proposal.total_gross_amount ?? "-"}
          </div>
          <div>
            <b>Végső határidő:</b> {proposal.final_deadline ?? "-"}
          </div>
        </div>
        {/* Munkafázisok */}
        <div>
          <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">Főbb munkafázisok</h4>
          {Array.isArray(proposal.main_work_phases_and_tasks) && proposal.main_work_phases_and_tasks.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {proposal.main_work_phases_and_tasks.map((phase: any, idx: number) => (
                <div key={idx} className="bg-white rounded p-4 border border-gray-300">
                  <h5 className="font-bold text-black mb-1">{phase.phase}</h5>
                  <ul className="list-disc list-inside text-black text-sm mb-2">
                    {phase.tasks && phase.tasks.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            "-"
          )}
        </div>
        {/* Ütemezés */}
        <div>
          <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">Időzítés, ütemezés</h4>
          {Array.isArray(proposal.timeline_and_scheduling_details) && proposal.timeline_and_scheduling_details.length > 0 ? (
            <ul className="list-disc list-inside text-black text-sm">
              {proposal.timeline_and_scheduling_details.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : typeof proposal.timeline_and_scheduling_details === "string" && proposal.timeline_and_scheduling_details.trim() !== "" ? (
            <div className="text-black text-sm">{proposal.timeline_and_scheduling_details}</div>
          ) : (
            "-"
          )}
        </div>
        {/* Költségek bontása */}
        <div>
          <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">Költségek bontása</h4>
          {proposal.estimated_costs_per_phase_and_total && Array.isArray(proposal.main_work_phases_and_tasks) ? (
            <ul className="list-disc list-inside text-black text-sm">
              {proposal.main_work_phases_and_tasks.map((phase: any, idx: number) => {
                const phaseKey = phase.phase;
                const value = proposal.estimated_costs_per_phase_and_total[phaseKey];
                if (!value) return null;
                return (
                  <li key={phaseKey}>
                    <b>{phase.phase}:</b> {value}
                  </li>
                );
              })}
              {proposal.estimated_costs_per_phase_and_total.total && (
                <li key="total">
                  <b>Összesen:</b> {proposal.estimated_costs_per_phase_and_total.total}
                </li>
              )}
            </ul>
          ) : (
            "-"
          )}
        </div>
        {/* Megjegyzések, javaslatok */}
        {Array.isArray(proposal.relevant_implementation_notes_or_recommendations) && proposal.relevant_implementation_notes_or_recommendations.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-black border-b pb-1">Megjegyzések, javaslatok</h4>
            <ul className="list-disc list-inside text-black text-sm">
              {proposal.relevant_implementation_notes_or_recommendations.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}