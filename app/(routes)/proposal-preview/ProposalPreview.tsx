import React from "react";

const ProposalPreview = ({ proposal }: { proposal: any }) => {
  return (
    <div className="max-w-auto mx-auto bg-white text-black">

      {/* Fejléc, címzett */}
      <div className="mb-8 border-b pb-4">
        <div className="text-right text-sm text-gray-500 mb-2">{new Date().toLocaleDateString('hu-HU')}</div>
        <h2 className="text-2xl font-extrabold text-black text-center mb-2">Ajánlatlevél</h2>
        <div className="mb-1"><b>Címzett:</b> {proposal.customer_name ?? "-"}</div>
        <div className="mb-1"><b>Email:</b> {proposal.customer_email ?? "-"}</div>
        <div className="mb-1"><b>Projekt helyszín:</b> {proposal.location ?? "-"}</div>
        <div className="mb-1"><b>Projekt típusa:</b> {proposal.project_type ?? "-"}</div>
      </div>

      {/* Tárgy */}
      <div className="mb-8 border-b pb-4">
        <b>Tárgy:</b> {proposal.property_type ? `${proposal.property_type} felújítási ajánlat` : "Felújítási ajánlat"}
      </div>

      {/* Bevezető szöveg */}
      <div className="mb-8">
        <p>Tisztelt {proposal.customer_name ?? "Ügyfél"}!</p>
        <p className="mt-4">Ezúton küldjük Önnek {proposal.location ? `ingatlan felújítására vonatkozó ajánlatunkat az alábbi részletekkel:` : "ingatlan felújítására vonatkozó ajánlatunkat az alábbi részletekkel:"}</p>
      </div>

      {/* Alapadatok */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">Projekt alapadatai</b>
        <div><b>Projekt típusa:</b> {proposal.project_type ?? "-"}</div>
        <div><b>Ingatlan típusa:</b> {proposal.property_type ?? "-"}</div>
        <div><b>Terület:</b> {proposal.area_sqm ? `${proposal.area_sqm} m²` : "-"}</div>
        <div><b>Felújítás terjedelme:</b> {proposal.scope ?? "-"}</div>
        <div><b>Végső határidő:</b> {proposal.final_deadline ?? "-"}</div>
        <div><b>Ütemezés:</b> {proposal.timeline ?? "-"}</div>
        <div><b>Költségbecslés:</b> {proposal.budget_estimate ?? "-"}</div>
        <div><b>ÁFA összege:</b> {proposal.vat_amount ?? "-"}</div>
        <div><b>Nettó összeg:</b> {proposal.total_net_amount ?? "-"}</div>
        <div><b>Bruttó összeg:</b> {proposal.total_gross_amount ?? "-"}</div>
        <div><b>Összefoglaló:</b> {proposal.summary_comment ?? "-"}</div>
      </div>

      {/* Elvárások, követelmények */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">Elvárások és követelmények</b>
        {proposal.must_haves && proposal.must_haves.length > 0 && (
          <div className="mb-2">
            <b>Kötelezők:</b>
            <ul className="list-disc ml-5">{proposal.must_haves.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {proposal.nice_to_haves && proposal.nice_to_haves.length > 0 && (
          <div className="mb-2">
            <b>Kívánatosak:</b>
            <ul className="list-disc ml-5">{proposal.nice_to_haves.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {proposal.requirements && proposal.requirements.length > 0 && (
          <div className="mb-2">
            <b>Követelmények:</b>
            <ul className="list-disc ml-5">{proposal.requirements.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {proposal.rooms_affected && proposal.rooms_affected.length > 0 && (
          <div className="mb-2">
            <b>Érintett helyiségek:</b>
            <ul className="list-disc ml-5">{proposal.rooms_affected.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {proposal.client_priorities && proposal.client_priorities.length > 0 && (
          <div className="mb-2">
            <b>Ügyfél prioritások:</b>
            <ul className="list-disc ml-5">        {proposal.client_priorities.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {proposal.constraints && proposal.constraints.length > 0 && (
          <div className="mb-2">
            <b>Korlátozások:</b>
            <ul className="list-disc ml-5">{proposal.constraints.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Főbb munkafázisok, költségek, feladatok */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">Főbb munkafázisok és költségek</b>
        {Array.isArray(proposal.main_work_phases_and_tasks) && Array.isArray(proposal.estimated_costs_per_phase_and_total) ? (
          <ul className="list-disc list-inside text-black text-sm">
            {proposal.main_work_phases_and_tasks.map((phase: any) => {
              const costObj = proposal.estimated_costs_per_phase_and_total.find(
                (item: any) => item.phase === phase.phase
              );
              return (
                <li key={phase.phase} className="mb-2">
                  <b>{phase.phase}:</b> {costObj?.cost || "-"}
                  {phase.tasks && phase.tasks.length > 0 && (
                    <ul className="list-disc ml-5">
                      {phase.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
            {/* Összesen/Total sor */}
            {proposal.estimated_costs_per_phase_and_total.some((item: any) => item.phase === "Total") && (
              <li key="total" className="font-bold">
                <b>Összesen:</b> {proposal.estimated_costs_per_phase_and_total.find((item: any) => item.phase === "Total").cost}
              </li>
            )}
          </ul>
        ) : "-"}
      </div>

      {/* Ütemezés részletei */}
      {proposal.timeline_and_scheduling_details && proposal.timeline_and_scheduling_details.length > 0 && (
        <div className="mb-8 border-b pb-4">
          <b className="block mb-2">Ütemezés részletei</b>
          <ul className="list-disc ml-5">{proposal.timeline_and_scheduling_details.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}

      {/* Záró formula, aláírás */}
      <div className="mt-8">
        <p>Kérdés esetén készséggel állunk rendelkezésére.</p>
        <p className="mt-4">Üdvözlettel,<br /><b>A kivitelező csapat</b></p>
      </div>
    </div>
  );
};

export default ProposalPreview;