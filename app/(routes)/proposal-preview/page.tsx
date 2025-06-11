"use client";
import { useSearchParams, useRouter } from "next/navigation";

import { usePDF, Resolution } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import ProposalPreview from "./ProposalPreview";
import EmailSender from "@/components/email-sender/EmailSender";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function ProposalPreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  let proposal = null;
  try {
    proposal = searchParams.get("proposal")
      ? JSON.parse(searchParams.get("proposal")!)
      : null;
  } catch {
    proposal = null;
  }

  const { toPDF, targetRef } = usePDF({
    filename: "ajanlat.pdf",
    resolution: Resolution.HIGH,
    method: "save",
    page: {
      format: "a4",
      orientation: "portrait",
      margin: 12,
    },
    canvas: {
      mimeType: "image/jpeg",
      qualityRatio: 1,
    },
    overrides: {
      canvas: { useCORS: true },
    },
  });

  type Proposal = {
    project_type?: string;
    customer_name?: string;
    customer_email?: string;
    location?: string;
    area_sqm?: string;
    timeline?: string;
    total_gross_amount?: string;
    total_net_amount?: string;
    vat_amount?: string;
    budget_estimate?: string;
    final_deadline?: string;
    missing_info?: string[];
    summary_comment?: string;
    main_work_phases_and_tasks?: { phase: string; tasks?: string[] }[];
    estimated_costs_per_phase_and_total?: { phase: string; cost: string }[];
  };

  function exportProposalToExcel(proposal: Proposal) {
    // 1. Projekt adatok a "Projekt" fülre (csak ha van érték)
    type Row = Record<string, string>;
    const projectRows: Row[] = [];
    const addIf = (label: string, value: string | number | undefined) => {
      if (value) projectRows.push({ Mező: label, Érték: String(value) });
    };

    addIf("Projekt típusa", proposal.project_type);
    addIf("Ügyfél", proposal.customer_name);
    addIf("Email", proposal.customer_email);
    addIf("Helyszín", proposal.location);
    addIf("Alapterület (nm)", proposal.area_sqm);
    addIf("Időszak", proposal.timeline);
    addIf("Bruttó összeg", proposal.total_gross_amount);
    addIf("Nettó összeg", proposal.total_net_amount);
    addIf("ÁFA", proposal.vat_amount);
    addIf("Becsült költség", proposal.budget_estimate);
    addIf("Határidő", proposal.final_deadline);

    // Hiányzó információk blokk, ha van
    if (proposal?.missing_info?.length) {
      projectRows.push({});
      projectRows.push({ Mező: "Hiányzó információk", Érték: "" });
      proposal.missing_info.forEach((info: string) => {
        if (info) projectRows.push({ Mező: "", Érték: info });
      });
    }

    // Megjegyzés/összegzés, ha van
    if (proposal.summary_comment) {
      projectRows.push({});
      projectRows.push({
        Mező: "Megjegyzés / Összegzés",
        Érték: proposal.summary_comment,
      });
    }

    // 2. Költségek a "Költségek" fülre
    interface CostRow {
  Fázis: string;
  Feladatok: string;
  Költség: string | number;
}
interface Phase {
  phase: string;
  tasks?: string[];
}
interface CostItem {
  phase: string;
  cost?: string | number;
}
const costRows: CostRow[] = [];
    // Fejléc
    costRows.push({
      Fázis: "Fázis",
      Feladatok: "Feladatok",
      Költség: "Költség",
    });

    if (
      proposal?.main_work_phases_and_tasks &&
      proposal?.estimated_costs_per_phase_and_total
    ) {
      proposal.main_work_phases_and_tasks.forEach((phase: Phase) => {
        const costObj = proposal.estimated_costs_per_phase_and_total?.find(
          (item: CostItem) => item.phase === phase.phase
        );
        if (
          phase.phase ||
          (phase.tasks && phase.tasks.length) ||
          (costObj && costObj.cost)
        ) {
          costRows.push({
            Fázis: phase.phase || "",
            Feladatok: phase.tasks?.join(", ") ?? "",
            Költség: costObj?.cost || "",
          });
        }
      });
      // Összesen sor, ha van
      const total = proposal.estimated_costs_per_phase_and_total.find(
        (item: CostItem) => item.phase === "Total"
      );
      if (total) {
        costRows.push({
          Fázis: "Összesen",
          Feladatok: "",
          Költség: total.cost,
        });
      }
    }

    // Excel generálás, két külön worksheet
    const wb = XLSX.utils.book_new();
    const wsProject = XLSX.utils.json_to_sheet(projectRows, {
      skipHeader: true,
    });
    const wsCost = XLSX.utils.json_to_sheet(costRows, { skipHeader: true });

    // Minimális formázás: például "Összesen" sor szürke háttér (ha támogatott)
    // SheetJS community edition csak néhány buildben támogatja a .s property-t!
    const lastCostRow = costRows.length;
    if (wsCost && wsCost["A" + lastCostRow]) {
      wsCost["A" + lastCostRow].s = {
        fill: { fgColor: { rgb: "DDDDDD" } }, // világosszürke háttér
        font: { bold: true },
      };
      wsCost["C" + lastCostRow].s = {
        fill: { fgColor: { rgb: "DDDDDD" } },
        font: { bold: true },
      };
    }
    // Fejléc félkövér (ha támogatott)
    ["A1", "B1", "C1"].forEach((cell) => {
      if (wsCost[cell]) wsCost[cell].s = { font: { bold: true } };
    });

    XLSX.utils.book_append_sheet(wb, wsProject, "Projekt");
    XLSX.utils.book_append_sheet(wb, wsCost, "Költségek");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "ajanlat-koltsegvetes.xlsx");
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="w-full max-w-6xl">
        <div className="flex flex-row items-center justify-between ml-2 mb-8 gap-4">
          <div className="flex flex-row gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Vissza
            </Button>
            <Button onClick={() => toPDF()}>PDF letöltése</Button>
            <Button onClick={() => exportProposalToExcel(proposal)}>
              Excel letöltése
            </Button>
          </div>
          <EmailSender email={proposal.customer_email} proposal={proposal} />
        </div>
        <div ref={targetRef} className="w-full bg-white p-8 shadow mb-8">
          <ProposalPreview proposal={proposal} />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          JSON Riport (nyers adat):
        </h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
          {proposal ? JSON.stringify(proposal, null, 2) : "Nincs adat"}
        </pre>
      </div>
    </div>
  );
}
