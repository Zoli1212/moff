"use client";

import { Cost, Phase, Proposal } from "@/types/proposal";
import { useLocale } from "@/components/i18n/LocaleProvider";
import React from "react";

const ProposalPreview = ({ proposal }: { proposal: Proposal }) => {
  const { t } = useLocale();

  return (
    <div className="max-w-auto mx-auto bg-white text-black">
      {/* Fejléc, címzett */}
      <div className="mb-8 border-b pb-4">
        <div className="text-right text-sm text-gray-500 mb-2">
          {new Date().toLocaleDateString("hu-HU")}
        </div>
        <h2 className="text-2xl font-extrabold text-black text-center mb-2">
          {t("proposal.title")}
        </h2>
        <div className="mb-1">
          <b>{t("proposal.recipient")}</b> {proposal.customer_name ?? "-"}
        </div>
        <div className="mb-1">
          <b>Email:</b> {proposal.customer_email ?? "-"}
        </div>
        <div className="mb-1">
          <b>{t("proposal.projectLocation")}</b> {proposal.location ?? "-"}
        </div>
        <div className="mb-1">
          <b>{t("proposal.projectType")}</b> {proposal.project_type ?? "-"}
        </div>
      </div>

      {/* Tárgy */}
      <div className="mb-8 border-b pb-4">
        <b>{t("proposal.subject")}</b>{" "}
        {proposal.property_type
          ? `${proposal.property_type} felújítási ajánlat`
          : t("proposal.renovationOffer")}
      </div>

      {/* Bevezető szöveg */}
      <div className="mb-8">
        <p>Tisztelt {proposal.customer_name ?? t("proposal.customer")}!</p>
        <p className="mt-4">
          Ezúton küldjük Önnek{" "}
          {proposal.location
            ? `ingatlan felújítására vonatkozó ajánlatunkat az alábbi részletekkel:`
            : t("proposal.intro")}
        </p>
      </div>

      {/* Alapadatok */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">Projekt alapadatai</b>
        <div>
          <b>{t("proposal.projectType")}</b> {proposal.project_type ?? "-"}
        </div>
        <div>
          <b>{t("proposal.propertyType")}</b> {proposal.property_type ?? "-"}
        </div>
        <div>
          <b>{t("proposal.area")}</b> {proposal.area_sqm ? `${proposal.area_sqm} m²` : "-"}
        </div>
        <div>
          <b>{t("proposal.scope")}</b> {proposal.scope ?? "-"}
        </div>
        <div>
          <b>{t("proposal.deadline")}</b> {proposal.final_deadline ?? "-"}
        </div>
        <div>
          <b>{t("proposal.schedule")}</b> {proposal.timeline ?? "-"}
        </div>
        <div>
          <b>{t("proposal.costEstimate")}</b> {proposal.budget_estimate ?? "-"}
        </div>
        <div>
          <b>{t("proposal.vat")}</b> {proposal.vat_amount ?? "-"}
        </div>
        <div>
          <b>{t("proposal.net")}</b> {proposal.total_net_amount ?? "-"}
        </div>
        <div>
          <b>{t("proposal.gross")}</b> {proposal.total_gross_amount ?? "-"}
        </div>
        <div>
          <b>{t("proposal.summary")}</b> {proposal.summary_comment ?? "-"}
        </div>
      </div>

      {/* Elvárások, követelmények */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">{t("proposal.expectations")}</b>
        {proposal.must_haves && proposal.must_haves.length > 0 && (
          <div className="mb-2">
            <b>{t("proposal.mandatory")}</b>
            <ul className="list-disc ml-5">
              {proposal.must_haves.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {proposal.nice_to_haves && proposal.nice_to_haves.length > 0 && (
          <div className="mb-2">
            <b>{t("proposal.desirable")}</b>
            <ul className="list-disc ml-5">
              {proposal.nice_to_haves.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {proposal.requirements && proposal.requirements.length > 0 && (
          <div className="mb-2">
            <b>{t("proposal.requirements")}</b>
            <ul className="list-disc ml-5">
              {proposal.requirements.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {proposal.rooms_affected && (
          <div className="mb-2">
            <b>{t("proposal.rooms")}</b>
            <ul className="list-disc ml-5">
              {Array.isArray(proposal.rooms_affected) ? (
                proposal.rooms_affected.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))
              ) : (
                <li>{proposal.rooms_affected}</li>
              )}
            </ul>
          </div>
        )}
        {proposal.client_priorities && (
          <div className="mb-2">
            <b>{t("proposal.priorities")}</b>
            <ul className="list-disc ml-5">
              {Array.isArray(proposal.client_priorities) ? (
                proposal.client_priorities.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))
              ) : (
                <li>{proposal.client_priorities}</li>
              )}
            </ul>
          </div>
        )}
        {proposal.constraints && proposal.constraints.length > 0 && (
          <div className="mb-2">
            <b>{t("proposal.constraints")}</b>
            <ul className="list-disc ml-5">
              {proposal.constraints.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Főbb munkafázisok, költségek, feladatok */}
      <div className="mb-8 border-b pb-4">
        <b className="block mb-2">{t("proposal.phases")}</b>
        {Array.isArray(proposal.main_work_phases_and_tasks) &&
        Array.isArray(proposal.estimated_costs_per_phase_and_total) ? (
          <ul className="list-disc list-inside text-black text-sm">
            {proposal.main_work_phases_and_tasks.map((phase: Phase) => {
              const costObj = proposal.estimated_costs_per_phase_and_total?.find(
                (item: Cost) => item.phase === phase.phase
              );
              return (
                <li key={phase.phase} className="mb-2">
                  <b>{phase.phase}:</b> {costObj?.cost || "-"}
                  {phase.tasks && phase.tasks.length > 0 && (
                    <ul className="list-disc ml-5">
                      {phase.tasks.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {/* Összesen/Total sor */}
            {proposal.estimated_costs_per_phase_and_total.some(
              (item: Cost) => item.phase === "Total"
            ) && (
              <li key="total" className="font-bold">
                <b>{t("od.total")}</b>{" "}
                {
                  proposal.estimated_costs_per_phase_and_total?.find(
                    (item: Cost) => item.phase === "Total"
                  )?.cost ?? ""
                }
              </li>
            )}
          </ul>
        ) : (
          "-"
        )}
      </div>

      {/* Ütemezés részletei */}
      {proposal.timeline_and_scheduling_details &&
        proposal.timeline_and_scheduling_details.length > 0 && (
          <div className="mb-8 border-b pb-4">
            <b className="block mb-2">{t("proposal.scheduleDetails")}</b>
            <ul className="list-disc ml-5">
            {Array.isArray(proposal.timeline_and_scheduling_details) ? (
              proposal.timeline_and_scheduling_details.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))
            ) : proposal.timeline_and_scheduling_details ? (
              <li>{proposal.timeline_and_scheduling_details}</li>
            ) : null}
            </ul>
          </div>
        )}

      {/* Záró formula, aláírás */}
      <div className="mt-8">
        <p>{t("proposal.closing")}</p>
        <p className="mt-4">
          {t("proposal.regards")}
          <br />
          <b>{t("proposal.team")}</b>
        </p>
      </div>
    </div>
  );
};

export default ProposalPreview;
