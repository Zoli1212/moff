"use client";

import React from "react";
import { FileDigit, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UserOptions } from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface AutoTableWithPrevious {
  (doc: jsPDF, options: Parameters<jsPDF["autoTable"]>[0]): void;
  previous?: { finalY?: number };
}

interface MaterialItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  materialUnitPrice?: number;
}

interface MaterialShareButtonsProps {
  materials: MaterialItem[];
  workId: number;
}

const sanitizeForPdf = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .replace(/\*/g, "")
    .replace(/[őö]/g, "o")
    .replace(/[ŐÖ]/g, "O");
};

export default function MaterialShareButtons({
  materials,
  workId,
}: MaterialShareButtonsProps) {
  const generatePdf = async (): Promise<Blob | null> => {
    if (!materials || materials.length === 0) return null;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add title
      doc.setFontSize(18);
      doc.text(sanitizeForPdf("Anyagbeszerzési lista"), 14, 22);

      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        sanitizeForPdf(`Létrehozva: ${new Date().toLocaleDateString("hu-HU")}`),
        14,
        30
      );
      doc.text(sanitizeForPdf(`Munka azonosító: ${workId}`), 14, 36);

      let finalY = 50;

      // Calculate total
      const totalMaterialCost = materials.reduce(
        (sum, item) =>
          sum + (item.materialUnitPrice || 0) * item.quantity,
        0
      );

      // Prepare table data
      const itemsData = materials.map((item, index) => [
        (index + 1).toString(),
        sanitizeForPdf(item.name),
        item.quantity.toString(),
        sanitizeForPdf(item.unit),
        sanitizeForPdf(
          (item.materialUnitPrice || 0).toLocaleString("hu-HU") + " Ft"
        ),
        sanitizeForPdf(
          ((item.materialUnitPrice || 0) * item.quantity).toLocaleString(
            "hu-HU"
          ) + " Ft"
        ),
      ]);

      const autoTableTyped: AutoTableWithPrevious = autoTable;

      const head = [
        "#",
        sanitizeForPdf("Anyag megnevezése"),
        sanitizeForPdf("Mennyiség"),
        sanitizeForPdf("Egység"),
        sanitizeForPdf("Egységár"),
        sanitizeForPdf("Összesen"),
      ];

      autoTableTyped(doc, {
        startY: finalY,
        head: [head],
        body: itemsData,
        theme: "grid" as const,
        headStyles: {
          fillColor: [254, 156, 0],
          textColor: 255,
          halign: "center",
          fontStyle: "bold",
          fontSize: 9,
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
          lineColor: [200, 200, 200],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 70, halign: "left" },
          2: { cellWidth: 20, halign: "right" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 30, halign: "right" },
          5: { cellWidth: 35, halign: "right" },
        },
        margin: { top: 10 },
        didDrawPage: function (data) {
          finalY = data.cursor?.y || 120;
          return true;
        },
      });

      // Add summary box
      const boxWidth = 100;
      const boxY = finalY + 10;
      const boxHeight = 25;
      const boxX = 190 - boxWidth;

      doc.setFillColor(255, 245, 230);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F");

      doc.setDrawColor(254, 156, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "S");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      const textY = boxY + 16;
      doc.text(sanitizeForPdf("Teljes anyagköltség:"), boxX + 10, textY);
      doc.text(
        sanitizeForPdf(`${totalMaterialCost.toLocaleString("hu-HU")} Ft`),
        boxX + boxWidth - 10,
        textY,
        { align: "right" }
      );

      return doc.output("blob");
    } catch (error) {
      console.error("Hiba a PDF generálása közben:", error);
      alert("Hiba történt a PDF generálása közben.");
      return null;
    }
  };

  const handleShare = async () => {
    if (!materials || materials.length === 0) return;

    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) {
        console.error("Nem sikerült létrehozni a PDF-t");
        return;
      }

      const pdfFile = new File([pdfBlob], "anyagbeszerzes.pdf", {
        type: "application/pdf",
      });

      if (navigator.share) {
        try {
          const shareData: ShareData & { files?: File[] } = {
            title: "Anyagbeszerzési lista",
            text: "Anyagbeszerzési lista PDF formátumban",
            files: [pdfFile],
          };

          await navigator.share(shareData);
          return;
        } catch (err) {
          console.error("Hiba a megosztás közben:", err);
          if (err instanceof Error && err.name !== "AbortError") {
            throw err;
          }
          return;
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "anyagbeszerzes.pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Hiba történt a megosztás során:", error);
      alert("Hiba történt a megosztás során.");
    }
  };

  const handleExcelDownload = async () => {
    try {
      if (!materials || materials.length === 0) return;

      const wb = XLSX.utils.book_new();

      // Project details sheet
      const projectDetails = [
        ["Anyagbeszerzési lista"],
        [""],
        ["Munka azonosító:", workId],
        ["Létrehozva:", new Date().toLocaleString("hu-HU")],
        ["Tételek száma:", materials.length],
        [""],
      ];

      const totalMaterialCost = materials.reduce(
        (sum, item) =>
          sum + (item.materialUnitPrice || 0) * item.quantity,
        0
      );

      projectDetails.push([
        "Teljes anyagköltség:",
        totalMaterialCost.toLocaleString("hu-HU") + " Ft",
      ]);

      const wsProject = XLSX.utils.aoa_to_sheet(projectDetails);
      if (!wsProject["!merges"]) wsProject["!merges"] = [];
      wsProject["!merges"].push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: 5 },
      });

      // Materials sheet
      const materialsData = [
        [
          "Anyag megnevezése",
          "Mennyiség",
          "Egység",
          "Egységár (Ft)",
          "Összesen (Ft)",
        ],
        ...materials.map((item) => [
          item.name,
          item.quantity,
          item.unit,
          (item.materialUnitPrice || 0).toLocaleString("hu-HU"),
          ((item.materialUnitPrice || 0) * item.quantity).toLocaleString(
            "hu-HU"
          ),
        ]),
      ];

      materialsData.push([
        "",
        "",
        "",
        "Összesen:",
        totalMaterialCost.toLocaleString("hu-HU") + " Ft",
      ]);

      const wsMaterials = XLSX.utils.aoa_to_sheet(materialsData);
      wsMaterials["!cols"] = [
        { wch: 50 },
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, wsProject, "Projekt adatok");
      XLSX.utils.book_append_sheet(wb, wsMaterials, "Anyagok");

      const excelBuffer = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "anyagbeszerzes.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Hiba az Excel letöltése közben:", error);
      alert("Hiba történt az Excel letöltése közben.");
    }
  };

  if (!materials || materials.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Megosztás */}
      <div className="text-xs font-medium text-gray-500 mb-1 text-center">
        Megosztás
      </div>
      <div className="flex gap-1.5 mb-1 justify-center">
        <button
          onClick={handleShare}
          aria-label="Megosztás"
          className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>
      {/* Letöltés */}
      <div className="text-xs font-medium text-gray-500 mb-1 text-center">
        Letöltés
      </div>
      <div className="flex gap-1.5 justify-center">
        {/* PDF */}
        <button
          onClick={async () => {
            try {
              const pdfBlob = await generatePdf();
              if (pdfBlob) {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "anyagbeszerzes.pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            } catch (error) {
              console.error("Hiba a PDF letöltése közben:", error);
              alert("Hiba történt a PDF letöltése közben.");
            }
          }}
          aria-label="PDF letöltése"
          className="bg-[#FE9C00] text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-[#e68a00] px-3 py-1 text-sm font-semibold"
        >
          <FileDigit className="w-4 h-4 mr-2" />
          <span>PDF</span>
        </button>
        {/* Excel */}
        <button
          onClick={handleExcelDownload}
          aria-label="Excel letöltése"
          className="bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-green-700 px-3 py-1 text-sm font-semibold"
        >
          <Sheet className="w-4 h-4 mr-2" />
          <span>EXCEL</span>
        </button>
      </div>
    </div>
  );
}
