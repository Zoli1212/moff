"use client";

import { usePathname } from 'next/navigation';
import { MessageCircle, Mail, Share2, FileText } from 'lucide-react';
import { useState } from 'react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
 // stabil regisztráció

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface AutoTableWithPrevious {
    (doc: jsPDF, options: any): void;
    previous?: { finalY?: number };
  }
  

interface SocialShareButtonsProps {
  offer?: {
    title?: string;
    description?: string | null;
    items?: Array<{
      name: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      totalPrice: string;
    }>;
    totalPrice?: number | null;
    notes?: string[];
    createdAt?: string | Date;
    validUntil?: string | Date | null;
    status?: string;
  };
}

export default function SocialShareButtons({ offer }: SocialShareButtonsProps) {
  const pathname = usePathname();
  const pageUrl = `${window.location.origin}${pathname}`;

  const getShareText = () => {
    if (!offer) return '';

    let text = `*${offer.title || 'Ajánlat'}*\n\n`;

    if (offer.description) {
      text += `${offer.description}\n\n`;
    }

    if (offer.items && offer.items.length > 0) {
      text += '*Tételek:*\n';
      offer.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} x ${item.unitPrice} = ${item.totalPrice}\n`;
      });
      text += '\n';
    }

    if (offer.totalPrice) {
      text += `*Összesen: ${offer.totalPrice.toLocaleString('hu-HU')} Ft*\n`;
    }

    if (offer.validUntil && new Date(offer.validUntil).toString() !== 'Invalid Date') {
      const validDate = new Date(offer.validUntil).toLocaleDateString('hu-HU');
      text += `\n*Érvényes: ${validDate}*\n`;
    }

    text += `\n${pageUrl}`;

    return text;
  };

  const generatePdf = async (): Promise<Blob | null> => {
    if (!offer) return null;
  
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
  
      doc.setFontSize(18);
      doc.text(offer.title || 'Ajánlat', 14, 22);
  
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Létrehozva: ${new Date().toLocaleDateString('hu-HU')}`, 14, 30);
  
      if (offer.description) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        const splitDesc = doc.splitTextToSize(offer.description, 180);
        doc.text(splitDesc, 14, 40);
      }
  
      let finalY = offer.description ? 50 : 40;
  
      if (offer.items && offer.items.length > 0) {
        const itemsData = offer.items.map((item, index) => [
          (index + 1).toString(),
          item.name,
          `${item.quantity} ${item.unit}`,
          `${item.unitPrice} Ft`,
          `${item.totalPrice} Ft`
        ]);
      
        const autoTableTyped: AutoTableWithPrevious = autoTable;

autoTableTyped(doc, {
  startY: finalY,
  head: [['#', 'Megnevezés', 'Mennyiség', 'Egységár', 'Összesen']],
  body: itemsData,
  theme: 'grid',
  headStyles: { fillColor: [41, 128, 185], textColor: 255 },
  styles: { fontSize: 10 },
  margin: { top: 10 },
});

finalY = autoTableTyped.previous?.finalY ?? 120;

      }
      
  
      if (offer.totalPrice) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Összesen: ${offer.totalPrice.toLocaleString('hu-HU')} Ft`, 14, finalY + 15);
      }
  
      if (offer.validUntil && new Date(offer.validUntil).toString() !== 'Invalid Date') {
        const date = new Date(offer.validUntil);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Érvényes: ${date.toLocaleDateString('hu-HU')}`, 14, finalY + 25);
      }
  
      return doc.output('blob');
    } catch (error) {
      console.error('Hiba a PDF generálása közben:', error);
      alert('Hiba történt a PDF generálása közben. Kérjük, próbáld újra később.');
      return null;
    }
  };

  const handleShare = async () => {
    if (!offer) return;

    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) {
        console.error('Nem sikerült létrehozni a PDF-t');
        return;
      }

      const pdfFile = new File([pdfBlob], 'ajanlat.pdf', { type: 'application/pdf' });

      if (navigator.share) {
        try {
          const shareData: ShareData & { files?: File[] } = {
            title: offer.title || 'Ajánlat',
            text: 'Itt az ajánlatod PDF formátumban',
            files: [pdfFile]
          };

          await navigator.share(shareData);
          return;
        } catch (err) {
          console.error('Hiba a megosztás közben:', err);
          if (err instanceof Error && err.name !== 'AbortError') {
            throw err;
          }
          return;
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ajanlat.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error('Hiba történt a megosztás során:', error);
      alert('Hiba történt a megosztás során. Kérjük, próbáld újra később.');
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
              '_blank'
            );
          } catch (error) {
            console.error('Hiba a Messenger megosztás során:', error);
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
            const subject = encodeURIComponent(offer.title || 'Ajánlat');
            const body = encodeURIComponent(getShareText() + '\n\nAz ajánlat letöltése: ' + pageUrl);
            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
          } catch (error) {
            console.error('Hiba az email küldése során:', error);
            alert('Hiba történt az email küldése során. Kérjük, próbáld újra később.');
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
            window.open(`https://wa.me/?text=${text}`, '_blank');
          } catch (error) {
            console.error('Hiba a WhatsApp megosztás során:', error);
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
            window.open(`viber://forward?text=${text}`, '_blank');
          } catch (error) {
            console.error('Hiba a Viber megosztás során:', error);
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
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ajanlat.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Hiba a PDF letöltése közben:', error);
            alert('Hiba történt a PDF letöltése közben. Kérjük, próbáld újra később.');
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
