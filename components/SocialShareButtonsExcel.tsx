"use client";

// import { usePathname } from "next/navigation";
import { FileDigit, Sheet } from "lucide-react"; // Ikonok frissítve PDF-hez és Excel-hez
import * as XLSX from "xlsx"; // Excel export

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// stabil regisztráció

// Import autoTable types from jspdf-autotable
import { UserOptions } from "jspdf-autotable";

// Extend jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// Type for the autoTable function with previous property
interface AutoTableWithPrevious {
  (doc: jsPDF, options: Parameters<jsPDF["autoTable"]>[0]): void;
  previous?: { finalY?: number };
}

interface OfferItem {
  id?: number;
  name: string;
  quantity: string;
  unit: string;
  materialUnitPrice: string;
  unitPrice: string;
  materialTotal: string;
  workTotal: string;
  totalPrice?: string; // For backward compatibility
}

interface SocialShareButtonsProps {
  offer?: {
    title?: string;
    description?: string | null;
    items?: OfferItem[];
    totalPrice?: number | null;
    notes?: string[];
    createdAt?: string | Date;
    validUntil?: string | Date | null;
    status?: string;
  };
}

// Helper function to format date
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "Nincs megadva";
  try {
    const d = new Date(date);
    return isNaN(d.getTime())
      ? "Érvénytelen dátum"
      : d.toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  } catch (e) {
    return `Érvénytelen dátum: ${(e as Error).message}`;
  }
};

// Helper function to get status display text
const getStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: "Piszkozat",
    sent: "Elküldve",
    accepted: "Elfogadva",
    rejected: "Elutasítva",
    expired: "Lejárt",
  };
  return statusMap[status] || status;
};

// Helper function to sanitize text for PDF (remove * and replace ő, ö with o)
const sanitizeForPdf = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .replace(/\*/g, "") // Remove asterisks
    .replace(/[őö]/g, "o") // Replace ő and ö with o
    .replace(/[ŐÖ]/g, "O"); // Replace Ő and Ö with O
};

export default function SocialShareButtonsExcel({
  offer,
}: SocialShareButtonsProps) {
  // const pathname = usePathname();
  // const pageUrl = `${window.location.origin}${pathname}`;

  // const getShareText = () => {
  //   if (!offer) return "";

  //   let text = `*${offer.title || "Ajánlat"}*\n\n`;

  //   if (offer.description) {
  //     text += `${offer.description}\n\n`;
  //   }

  //   if (offer.items && offer.items.length > 0) {
  //     text += "*Tételek:*\n";
  //     offer.items.forEach((item, index) => {
  //       text += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit}\n`;
  //       text += `   Anyag: ${item.materialUnitPrice || "0 Ft"} x ${item.quantity} = ${item.materialTotal || "0 Ft"}\n`;
  //       text += `   Munkadíj: ${item.unitPrice || "0 Ft"} x ${item.quantity} = ${item.workTotal || "0 Ft"}\n\n`;
  //     });
  //     text += "\n";
  //   }

  //   // Calculate totals if not provided
  //   let materialTotal = 0;
  //   let workTotal = 0;

  //   if (offer.items && offer.items.length > 0) {
  //     const totals = offer.items.reduce(
  //       (acc, item) => {
  //         const material =
  //           parseFloat(
  //             (item.materialTotal || "0")
  //               .replace(/[^0-9,-]+/g, "")
  //               .replace(",", ".")
  //           ) || 0;
  //         const work =
  //           parseFloat(
  //             (item.workTotal || "0")
  //               .replace(/[^0-9,-]+/g, "")
  //               .replace(",", ".")
  //           ) || 0;
  //         return {
  //           material: acc.material + material,
  //           work: acc.work + work,
  //         };
  //       },
  //       { material: 0, work: 0 }
  //     );

  //     materialTotal = totals.material;
  //     workTotal = totals.work;
  //   }

  //   text += `*Összesítés:*\n`;
  //   text += `Munkadíj: ${workTotal.toLocaleString("hu-HU")} Ft\n`;
  //   text += `Anyagköltség: ${materialTotal.toLocaleString("hu-HU")} Ft\n`;
  //   text += `*Összesen: ${(workTotal + materialTotal).toLocaleString("hu-HU")} Ft*\n\n`;

  //   if (
  //     offer.validUntil &&
  //     new Date(offer.validUntil).toString() !== "Invalid Date"
  //   ) {
  //     const validDate = formatDate(offer.validUntil);
  //     text += `*Érvényes: ${validDate}*\n`;
  //   }

  //   text += `\n${pageUrl}`;

  //   return text;
  // };

  const generatePdf = async (): Promise<Blob | null> => {
    if (!offer) return null;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add title
      doc.setFontSize(18);
      doc.text(sanitizeForPdf(offer.title || "Ajánlat"), 14, 22);

      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        sanitizeForPdf(`Létrehozva: ${formatDate(offer.createdAt || new Date())}`),
        14,
        30
      );
      if (offer.validUntil) {
        doc.text(sanitizeForPdf(`Érvényes: ${formatDate(offer.validUntil)}`), 14, 36);
      }
      doc.text(sanitizeForPdf(`Státusz: ${getStatusDisplay(offer.status || "draft")}`), 14, 42);

      let finalY = 50;

      if (offer.items && offer.items.length > 0) {
        // Calculate totals
        const totals = offer.items.reduce(
          (acc, item) => {
            const materialTotal =
              parseFloat(
                (item.materialTotal || "0")
                  .replace(/[^0-9,-]+/g, "")
                  .replace(",", ".")
              ) || 0;
            const workTotal =
              parseFloat(
                (item.workTotal || "0")
                  .replace(/[^0-9,-]+/g, "")
                  .replace(",", ".")
              ) || 0;
            return {
              material: acc.material + materialTotal,
              work: acc.work + workTotal,
            };
          },
          { material: 0, work: 0 }
        );

        // Prepare table data with all 7 columns
        const itemsData = offer.items.map((item, index) => [
          (index + 1).toString(),
          sanitizeForPdf(item.name),
          sanitizeForPdf(item.quantity),
          sanitizeForPdf(item.unit),
          sanitizeForPdf(item.materialUnitPrice || "0 Ft"),
          sanitizeForPdf(item.unitPrice || "0 Ft"),
          sanitizeForPdf(item.materialTotal || "0 Ft"),
          sanitizeForPdf(item.workTotal || "0 Ft"),
        ]);

        const autoTableTyped: AutoTableWithPrevious = autoTable;

        // Prepare table headers for all 7 columns
        const head = [
          "#",
          sanitizeForPdf("Tétel megnevezése"),
          sanitizeForPdf("Mennyiség"),
          sanitizeForPdf("Egység"),
          sanitizeForPdf("Anyag egységár"),
          sanitizeForPdf("Díj egységár"),
          sanitizeForPdf("Anyag összesen"),
          sanitizeForPdf("Díj összesen"),
        ];

        // Add the main table
        autoTableTyped(doc, {
          startY: finalY,
          head: [head],
          body: itemsData,
          theme: "grid" as const,
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            halign: "center",
            fontStyle: "bold",
            fontSize: 8,
          },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: "linebreak",
            cellWidth: "wrap",
            lineColor: [200, 200, 200],
          },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" }, // #
            1: { cellWidth: 55, halign: "left" }, // Tétel
            2: { cellWidth: 15, halign: "right" }, // Mennyiség
            3: { cellWidth: 15, halign: "center" }, // Egység
            4: { cellWidth: 25, halign: "right" }, // Anyag egységár
            5: { cellWidth: 25, halign: "right" }, // Díj egységár
            6: { cellWidth: 25, halign: "right" }, // Anyag összesen
            7: { cellWidth: 25, halign: "right" }, // Díj összesen
          },
          margin: { top: 10 },
          didDrawPage: function (data) {
            finalY = data.cursor?.y || 120;
            return true;
          },
        });

        // Add light blue background for summary (right-aligned and below table)
        const boxWidth = 100; // Width of the summary box
        const boxY = finalY + 10; // Add some space after table
        const boxHeight = 45;
        const boxX = 190 - boxWidth; // Right-align the box

        // Draw light blue background
        doc.setFillColor(230, 240, 255);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F");

        // Add subtle border
        doc.setDrawColor(200, 220, 255);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "S");

        // Add summary text
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        // Calculate text positions relative to the box
        const textY1 = boxY + 12;
        const textY2 = boxY + 24;
        const textY3 = boxY + 36;

        // Work total
        doc.text(sanitizeForPdf("Munkadíj összesen:"), boxX + 10, textY1);
        doc.text(
          sanitizeForPdf(`${totals.work.toLocaleString("hu-HU")} Ft`),
          boxX + boxWidth - 10,
          textY1,
          { align: "right" }
        );

        // Material cost
        doc.text(sanitizeForPdf("Anyagköltség összesen:"), boxX + 10, textY2);
        doc.text(
          sanitizeForPdf(`${totals.material.toLocaleString("hu-HU")} Ft`),
          boxX + boxWidth - 10,
          textY2,
          { align: "right" }
        );

        // Total cost
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(sanitizeForPdf("Összesített nettó költség:"), boxX + 10, textY3);
        doc.text(
          sanitizeForPdf(`${(totals.work + totals.material).toLocaleString("hu-HU")} Ft`),
          boxX + boxWidth - 10,
          textY3,
          { align: "right" }
        );

        finalY += boxHeight + 10;
      }

      if (
        offer.validUntil &&
        new Date(offer.validUntil).toString() !== "Invalid Date"
      ) {
        const date = new Date(offer.validUntil);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(
          sanitizeForPdf(`Érvényes: ${date.toLocaleDateString("hu-HU")}`),
          14,
          finalY + 15
        );
      }

      return doc.output("blob");
    } catch (error) {
      console.error("Hiba a PDF generálása közben:", error);
      alert(
        "Hiba történt a PDF generálása közben. Kérjük, próbáld újra később."
      );
      return null;
    }
  };

  const handleShare = async () => {
    if (!offer) return;

    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) {
        console.error("Nem sikerült létrehozni a PDF-t");
        return;
      }

      const pdfFile = new File([pdfBlob], "ajanlat.pdf", {
        type: "application/pdf",
      });

      if (navigator.share) {
        try {
          const shareData: ShareData & { files?: File[] } = {
            title: offer.title || "Ajánlat",
            text: "Itt az ajánlatod PDF formátumban",
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
      a.download = "ajanlat.pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Hiba történt a megosztás során:", error);
      alert("Hiba történt a megosztás során. Kérjük, próbáld újra később.");
    }
  };

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
                a.download = "ajanlat.pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            } catch (error) {
              console.error("Hiba a PDF letöltése közben:", error);
              alert(
                "Hiba történt a PDF letöltése közben. Kérjük, próbáld újra később."
              );
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
          onClick={async () => {
            try {
              if (!offer) return;
              // --- Excel generálás logika ---
              // 1. Workbook létrehozása
              const wb = XLSX.utils.book_new();

              // 2. Projekt adatok sheet
              const projectDetails = [
                ["Projekt adatok"],
                [""],
                ["Ajánlat", offer?.title || ""],
                ["Leírás", offer?.description || ""],
                ["Státusz", offer?.status || ""],
                [
                  "Létrehozva",
                  offer?.createdAt
                    ? new Date(offer.createdAt).toLocaleString("hu-HU")
                    : "",
                ],
                [
                  "Érvényes",
                  offer?.validUntil
                    ? new Date(offer.validUntil).toLocaleDateString("hu-HU")
                    : "",
                ],
                [""],
              ];
              if (offer?.totalPrice) {
                projectDetails.push([
                  "Összesített nettó költség:",
                  offer.totalPrice.toLocaleString("hu-HU") + " Ft",
                ]);
              }
              const wsProject = XLSX.utils.aoa_to_sheet(projectDetails);
              if (!wsProject["!merges"]) wsProject["!merges"] = [];
              wsProject["!merges"].push({
                s: { r: 0, c: 0 },
                e: { r: 0, c: 6 },
              });

              // 3. Tételek sheet
              const offerItemsData = [
                [
                  "Tétel megnevezése",
                  "Mennyiség",
                  "Egység",
                  "Anyag egységár",
                  "Díj egységár",
                  "Anyag összesen",
                  "Díj összesen",
                ],
                ...(offer?.items || []).map((item) => [
                  item.name,
                  item.quantity,
                  item.unit,
                  item.materialUnitPrice,
                  item.unitPrice,
                  item.materialTotal,
                  item.workTotal,
                ]),
              ];
              if (offer?.totalPrice) {
                offerItemsData.push([
                  "",
                  "",
                  "",
                  "",
                  "",
                  "Összesen:",
                  offer.totalPrice.toLocaleString("hu-HU") + " Ft",
                ]);
              }
              const wsItems = XLSX.utils.aoa_to_sheet(offerItemsData);
              wsItems["!cols"] = [
                { wch: 40 },
                { wch: 10 },
                { wch: 8 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
              ];

              XLSX.utils.book_append_sheet(wb, wsProject, "Projekt adatok");
              XLSX.utils.book_append_sheet(wb, wsItems, "Ajánlat tételes");

              // 4. Excel file generálás és letöltés
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
              a.download = "ajanlat.xlsx";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error("Hiba az Excel letöltése közben:", error);
              alert(
                "Hiba történt az Excel letöltése közben. Kérjük, próbáld újra később."
              );
            }
          }}
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
