import { Proposal } from "@/types/proposal";
import * as XLSX from "xlsx";



type Row = { [key: string]: string };

export function exportProposalToExcelAsBase64(proposal: Proposal): string {
  const projectRows: Row[] = [];

  const addIf = (label: string, value: string | undefined) => {
    if (value) projectRows.push({ "Mező": label, "Érték": value });
  };

  addIf("Projekt típusa", proposal.project_type);
  addIf("Ügyfél", proposal.customer_name);
  addIf("Email", proposal.customer_email);
  addIf("Helyszín", proposal.location);
  addIf("Alapterület (nm)", proposal?.area_sqm?.toString());
  addIf("Időszak", proposal.timeline);
  addIf("Bruttó összeg", proposal?.total_gross_amount?.toString());
  addIf("Nettó összeg", proposal?.total_net_amount?.toString());
  addIf("ÁFA", proposal?.vat_amount?.toString());
  addIf("Becsült költség", proposal?.budget_estimate?.toString());
  addIf("Határidő", proposal?.final_deadline);

  if (proposal?.missing_info?.length) {
    projectRows.push({});
    projectRows.push({ "Mező": "Hiányzó információk", "Érték": "" });
    proposal.missing_info.forEach((info: string) => {
      if (info) projectRows.push({ "Mező": "", "Érték": info });
    });
  }

  if (proposal.summary_comment) {
    projectRows.push({});
    projectRows.push({ "Mező": "Megjegyzés / Összegzés", "Érték": proposal.summary_comment });
  }

  const costRows: Row[] = [];
  costRows.push({ "Fázis": "Fázis", "Feladatok": "Feladatok", "Költség": "Költség" });

  if (proposal?.main_work_phases_and_tasks && proposal?.estimated_costs_per_phase_and_total) {
    proposal.main_work_phases_and_tasks.forEach((phase) => {
      const costObj = proposal.estimated_costs_per_phase_and_total!.find(
        (item) => item.phase === phase.phase
      );
      if (phase.phase || (phase.tasks && phase.tasks.length) || (costObj && costObj.cost)) {
        costRows.push({
          "Fázis": phase.phase || "",
          "Feladatok": phase.tasks?.join(", ") ?? "",
          "Költség": costObj?.cost?.toString() || "",
        });
      }
    });

    const total = proposal.estimated_costs_per_phase_and_total.find(
      (item) => item.phase === "Total"
    );
    if (total) {
      costRows.push({
        "Fázis": "Összesen",
        "Feladatok": "",
        "Költség": total.cost?.toString() || "",
      });
    }
  }

  const wb = XLSX.utils.book_new();
  const wsProject = XLSX.utils.json_to_sheet(projectRows, { skipHeader: true });
  const wsCost = XLSX.utils.json_to_sheet(costRows, { skipHeader: true });
  XLSX.utils.book_append_sheet(wb, wsProject, "Projekt");
  XLSX.utils.book_append_sheet(wb, wsCost, "Költségek");
  const excelBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });

  return excelBase64;
}
