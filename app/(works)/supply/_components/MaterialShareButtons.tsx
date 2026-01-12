"use client";

import React from "react";
import { FileDigit, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UserOptions } from "jspdf-autotable";
import { useUser } from "@clerk/nextjs";

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
}: MaterialShareButtonsProps) {
  const { user } = useUser();

  const generatePdf = async (): Promise<Blob | null> => {
    if (!materials || materials.length === 0) return null;

    try {
      // Fetch user address data
      const addressResponse = await fetch('/api/user/address');
      const addressData = addressResponse.ok ? await addressResponse.json() : {};

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add greeting
      doc.setFontSize(14);
      doc.text(sanitizeForPdf("T. címzett!"), 14, 22);

      // Add request text
      doc.setFontSize(11);
      doc.text(sanitizeForPdf("Kérek ajánlatot a következő tételekre:"), 14, 32);

      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      let yPos = 42;

      // User info section
      doc.text(sanitizeForPdf("Kérelmező adatai:"), 14, yPos);
      yPos += 6;

      if (user?.fullName) {
        doc.text(sanitizeForPdf(`Név: ${user.fullName}`), 14, yPos);
        yPos += 5;
      }

      if (user?.primaryEmailAddress?.emailAddress) {
        doc.text(sanitizeForPdf(`Email: ${user.primaryEmailAddress.emailAddress}`), 14, yPos);
        yPos += 5;
      }

      if (addressData.companyName) {
        doc.text(sanitizeForPdf(`Cégnév: ${addressData.companyName}`), 14, yPos);
        yPos += 5;
      }

      if (addressData.address) {
        doc.text(sanitizeForPdf(`Cím: ${addressData.zip} ${addressData.city}, ${addressData.address}`), 14, yPos);
        yPos += 5;
      }

      if (addressData.country) {
        doc.text(sanitizeForPdf(`Ország: ${addressData.country}`), 14, yPos);
        yPos += 5;
      }

      doc.text(sanitizeForPdf(`Dátum: ${new Date().toLocaleDateString("hu-HU")}`), 14, yPos);
      yPos += 10;

      let finalY = yPos;

      // Prepare table data with empty price columns (for supplier to fill)
      const itemsData = materials.map((item, index) => [
        (index + 1).toString(),
        sanitizeForPdf(item.name),
        item.quantity.toString(),
        sanitizeForPdf(item.unit),
        "", // Empty unit price
        "", // Empty total
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

      // Add summary box for total material cost (empty for supplier to fill)
      const boxWidth = 100;
      const boxY = finalY + 10;
      const boxHeight = 15;
      const boxX = 190 - boxWidth;

      // Orange/yellow background
      doc.setFillColor(255, 245, 230);
      doc.rect(boxX, boxY, boxWidth, boxHeight, "F");

      // Orange border
      doc.setDrawColor(254, 156, 0);
      doc.setLineWidth(0.8);
      doc.rect(boxX, boxY, boxWidth, boxHeight, "S");

      // Add text
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      const textY = boxY + 10;
      doc.text(sanitizeForPdf("Összesített anyagár:"), boxX + 5, textY);

      // Empty space for supplier to fill in
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      const lineStartX = boxX + 55;
      const lineEndX = boxX + boxWidth - 5;
      doc.line(lineStartX, textY + 1, lineEndX, textY + 1);

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

      // Fetch user address data
      const addressResponse = await fetch('/api/user/address');
      const addressData = addressResponse.ok ? await addressResponse.json() : {};

      const wb = XLSX.utils.book_new();

      // Get current date in Hungarian format
      const currentDate = new Date().toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // Request details sheet
      const requestDetails = [
        ["T. címzett!"],
        [""],
        ["Kérek ajánlatot a következő tételekre:"],
        [""],
        ["Kérelmező adatai:"],
        ...(user?.fullName ? [["Név:", user.fullName]] : []),
        ...(user?.primaryEmailAddress?.emailAddress ? [["Email:", user.primaryEmailAddress.emailAddress]] : []),
        ...(addressData.companyName ? [["Cégnév:", addressData.companyName]] : []),
        ...(addressData.zip && addressData.city && addressData.address ? [["Cím:", `${addressData.zip} ${addressData.city}, ${addressData.address}`]] : []),
        ...(addressData.country ? [["Ország:", addressData.country]] : []),
        [""],
        ["Dátum:", currentDate],
      ];

      const wsRequest = XLSX.utils.aoa_to_sheet(requestDetails);
      if (!wsRequest['!merges']) wsRequest['!merges'] = [];
      wsRequest['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });

      // Materials sheet with empty columns for supplier to fill
      const materialsData = [
        ["Anyag megnevezése", "Mennyiség", "Egység", "Egységár", "Összesen"],
        ...materials.map(item => [
          item.name,
          item.quantity,
          item.unit,
          "", // Empty for supplier to fill
          ""  // Empty for supplier to fill
        ]),
        ["", "", "", "", ""], // Empty row
        ["", "", "", "Teljes anyagköltség:", ""] // Total row with empty value
      ];

      const wsMaterials = XLSX.utils.aoa_to_sheet(materialsData);
      wsMaterials["!cols"] = [
        { wch: 40 }, // Anyag megnevezése
        { wch: 10 }, // Mennyiség
        { wch: 10 }, // Egység
        { wch: 15 }, // Egységár (empty)
        { wch: 15 }, // Összesen (empty)
      ];

      XLSX.utils.book_append_sheet(wb, wsRequest, "Adatok");
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
