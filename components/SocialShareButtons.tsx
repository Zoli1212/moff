"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, Mail, Share2, FileText } from "lucide-react";

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
  workUnitPrice: string;
  materialTotal: string;
  workTotal: string;
  unitPrice?: string; // For backward compatibility
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
    return "Érvénytelen dátum";
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

export default function SocialShareButtons({ offer }: SocialShareButtonsProps) {
  const pathname = usePathname();
  const pageUrl = `${window.location.origin}${pathname}`;

  const getShareText = () => {
    if (!offer) return "";

    let text = `*${offer.title || "Ajánlat"}*\n\n`;

    if (offer.description) {
      text += `${offer.description}\n\n`;
    }

    if (offer.items && offer.items.length > 0) {
      text += "*Tételek:*\n";
      offer.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit}\n`;
        text += `   Anyag: ${item.materialUnitPrice || "0 Ft"} x ${item.quantity} = ${item.materialTotal || "0 Ft"}\n`;
        text += `   Munkadíj: ${item.workUnitPrice || "0 Ft"} x ${item.quantity} = ${item.workTotal || "0 Ft"}\n\n`;
      });
      text += "\n";
    }

    // Calculate totals if not provided
    let materialTotal = 0;
    let workTotal = 0;

    if (offer.items && offer.items.length > 0) {
      const totals = offer.items.reduce(
        (acc, item) => {
          const material =
            parseFloat(
              (item.materialTotal || "0")
                .replace(/[^0-9,-]+/g, "")
                .replace(",", ".")
            ) || 0;
          const work =
            parseFloat(
              (item.workTotal || "0")
                .replace(/[^0-9,-]+/g, "")
                .replace(",", ".")
            ) || 0;
          return {
            material: acc.material + material,
            work: acc.work + work,
          };
        },
        { material: 0, work: 0 }
      );

      materialTotal = totals.material;
      workTotal = totals.work;
    }

    text += `*Összesítés:*\n`;
    text += `Munkadíj: ${workTotal.toLocaleString("hu-HU")} Ft\n`;
    text += `Anyagköltség: ${materialTotal.toLocaleString("hu-HU")} Ft\n`;
    text += `*Összesen: ${(workTotal + materialTotal).toLocaleString("hu-HU")} Ft*\n\n`;

    if (
      offer.validUntil &&
      new Date(offer.validUntil).toString() !== "Invalid Date"
    ) {
      const validDate = formatDate(offer.validUntil);
      text += `*Érvényes: ${validDate}*\n`;
    }

    text += `\n${pageUrl}`;

    return text;
  };

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
      doc.text(offer.title || "Ajánlat", 14, 22);

      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Létrehozva: ${formatDate(offer.createdAt || new Date())}`,
        14,
        30
      );
      if (offer.validUntil) {
        doc.text(`Érvényes: ${formatDate(offer.validUntil)}`, 14, 36);
      }
      doc.text(`Státusz: ${getStatusDisplay(offer.status || "draft")}`, 14, 42);

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
          item.name,
          item.quantity,
          item.unit,
          item.materialUnitPrice || "0 Ft",
          item.workUnitPrice || "0 Ft",
          item.materialTotal || "0 Ft",
          item.workTotal || "0 Ft",
        ]);

        const autoTableTyped: AutoTableWithPrevious = autoTable;

        // Prepare table headers for all 7 columns
        const head = [
          "#",
          "Tétel megnevezése",
          "Mennyiség",
          "Egység",
          "Anyag egységár",
          "Díj egységár",
          "Anyag összesen",
          "Díj összesen",
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
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F');
        
        // Add subtle border
        doc.setDrawColor(200, 220, 255);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'S');
        
        // Add summary text
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        
        // Calculate text positions relative to the box
        const textY1 = boxY + 12;
        const textY2 = boxY + 24;
        const textY3 = boxY + 36;
        const rightAlign = boxX + boxWidth - 10; // Right edge - 10mm margin
        
        // Work total
        doc.text("Munkadíj összesen:", boxX + 10, textY1);
        doc.text(
          `${totals.work.toLocaleString("hu-HU")} Ft`,
          boxX + boxWidth - 10,
          textY1,
          { align: "right" }
        );

        // Material cost
        doc.text("Anyagköltség összesen:", boxX + 10, textY2);
        doc.text(
          `${totals.material.toLocaleString("hu-HU")} Ft`,
          boxX + boxWidth - 10,
          textY2,
          { align: "right" }
        );

        // Total cost
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Összesített nettó költség:", boxX + 10, textY3);
        doc.text(
          `${(totals.work + totals.material).toLocaleString("hu-HU")} Ft`,
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
          `Érvényes: ${date.toLocaleDateString("hu-HU")}`,
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
    <div className="flex gap-2">
      {/* Native Share */}
      <button
        onClick={handleShare}
        aria-label="Megosztás"
        className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-gray-200"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Messenger */}
      <button
        onClick={() => {
          if (!offer) return;
          try {
            const text = encodeURIComponent(getShareText());
            window.open(
              `fb-messenger://share/?link=${encodeURIComponent(pageUrl)}&app_id=YOUR_APP_ID&quote=${text}`,
              "_blank"
            );
          } catch (error) {
            console.error("Hiba a Messenger megosztás során:", error);
          }
        }}
        aria-label="Megosztás Messengeren"
        className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-blue-700"
      >
        <MessageCircle className="w-4 h-4" />
      </button>

      {/* Email */}
      <button
        onClick={() => {
          if (!offer) return;
          try {
            const subject = encodeURIComponent(offer.title || "Ajánlat");
            const body = encodeURIComponent(
              getShareText() + "\n\nAz ajánlat letöltése: " + pageUrl
            );
            window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
          } catch (error) {
            console.error("Hiba az email küldése során:", error);
            alert(
              "Hiba történt az email küldése során. Kérjük, próbáld újra később."
            );
          }
        }}
        aria-label="Megosztás emailben"
        className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-gray-700"
      >
        <Mail className="w-4 h-4" />
      </button>

      {/* WhatsApp */}
      <button
        onClick={() => {
          if (!offer) return;
          try {
            const text = encodeURIComponent(getShareText());
            window.open(`https://wa.me/?text=${text}`, "_blank");
          } catch (error) {
            console.error("Hiba a WhatsApp megosztás során:", error);
          }
        }}
        aria-label="Megosztás WhatsAppon"
        className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-green-700"
      >
        <MessageCircle className="w-4 h-4" />
      </button>

      {/* Viber */}
      <button
        onClick={() => {
          if (!offer) return;
          try {
            const text = encodeURIComponent(getShareText());
            window.open(`viber://forward?text=${text}`, "_blank");
          } catch (error) {
            console.error("Hiba a Viber megosztás során:", error);
          }
        }}
        aria-label="Megosztás Viberen"
        className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-purple-700"
      >
        <MessageCircle className="w-4 h-4" />
      </button>

      {/* PDF */}
      <button
        onClick={async () => {
          try {
            const pdfBlob = await generatePdf();
            if (!pdfBlob) return;

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "ajanlat.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Hiba a PDF letöltése közben:", error);
            alert(
              "Hiba történt a PDF letöltése közben. Kérjük, próbáld újra később."
            );
          }
        }}
        aria-label="PDF letöltése"
        className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-red-700"
      >
        <FileText className="w-4 h-4" />
      </button>
    </div>
  );
}
