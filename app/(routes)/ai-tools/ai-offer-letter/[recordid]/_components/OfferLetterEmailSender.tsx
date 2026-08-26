'use client';

import { useState, useEffect } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUser } from "@clerk/nextjs";

export default function OfferLetterEmailSender({ 
  items, 
  total, 
  time, 
  title = "Ajánlat",
  name,
  email
}: { 
  items: Array<{
    name: string;
    quantity: string;
    unit: string;
    materialUnitPrice: string;
    workUnitPrice: string;
    materialTotal: string;
    workTotal: string;
  }>;
  total?: string;
  time?: string;
  title?: string;
  name?: string;
  email?: string;
}) {
  const { t } = useLocale();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const { user } = useUser();
  
  // Set current user's email when user data is available
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setCurrentUserEmail(user.primaryEmailAddress.emailAddress || "");
    }
    // Set recipient email from props if available
    if (email) {
      setRecipientEmail(email);
    }
  }, [user, email]);
  

  const exportToExcel = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // 1. Project details sheet
    const projectDetails = [
      ["Projekt adatok"],
      [""],
      [t("od.offer"), email],
      [t("letter.customer"), name || "N/A"],
      ["Cím", title],
      [""],
      [t("letter.summary")],
      [t("od.netTotal"), total || "N/A"],
      [t("letter.estimatedTime"), time ? `${time} munkanap` : "N/A"],
      [""],
      [t("od.createdAt"), new Date().toLocaleString('hu-HU')],
    ];
    
    const wsProject = XLSX.utils.aoa_to_sheet(projectDetails);
    
    // Apply some basic styling to the project details sheet
    // Merge title row
    if (!wsProject['!merges']) wsProject['!merges'] = [];
    wsProject['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
    
    // 2. Offer items sheet
    const offerItemsData = [
      [t("od.itemLabel"), t("od.quantity"), t("od.unit"), t("od.materialUnitPrice"), t("od.feeUnitPrice"), t("od.materialTotal"), t("od.feeTotal")],
      ...items.map(item => [
        item.name,
        item.quantity,
        item.unit,
        item.materialUnitPrice,
        item.workUnitPrice,
        item.materialTotal,
        item.workTotal
      ])
    ];

    if (total) {
      offerItemsData.push(["", "", "", "", "", t("od.total"), total]);
    }

    const wsItems = XLSX.utils.aoa_to_sheet(offerItemsData);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 40 }, // Tétel megnevezése
      { wch: 10 }, // Mennyiség
      { wch: 8 },  // Egység
      { wch: 15 }, // Anyag egységár
      { wch: 15 }, // Díj egységár
      { wch: 15 }, // Anyag összesen
      { wch: 15 }  // Díj összesen
    ];
    
    wsItems['!cols'] = colWidths;
    
    // Add both worksheets to the workbook
    XLSX.utils.book_append_sheet(wb, wsProject, "Projekt adatok");
    XLSX.utils.book_append_sheet(wb, wsItems, t("letter.itemised"));
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Convert to base64 for email attachment
    return Buffer.from(excelBuffer).toString('base64');
  };

  const sendEmail = async (recipientEmail: string, isCurrentUser: boolean = false) => {
    try {
      setIsSending(true);
      
      const excelBase64 = exportToExcel();
      
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          subject: `Ajánlat - ${title}`,
          text: 'Küldjük Önnek a kért ajánlatot csatolmányban.',
          attachments: [{
            filename: `ajanlat-${Date.now()}.xlsx`,
            content: excelBase64
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Hiba történt az email küldésekor');
      }
      
      toast.success(`Sikeresen elküldve a(z) ${isCurrentUser ? 'saját' : 'címzett'} email címre!`);
      
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba';
      toast.error(`Hiba történt az email küldésekor: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToBoth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientEmail || !currentUserEmail) {
      toast.error(t("proc.needBothEmails"));
      return;
    }
    
    // Send to the provided email
    await sendEmail(recipientEmail, false);
    
    // Send to current user's email
    await sendEmail(currentUserEmail, true);
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium mb-4">{t("od.sendByEmail")}</h3>
      
      <form onSubmit={handleSendToBoth} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("letter.recipientEmail")}</Label>
          <Input
            id="email"
            type="email"
            placeholder="cimzett@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currentUserEmail">{t("proc.ownEmail")}</Label>
          <Input
            id="currentUserEmail"
            type="email"
            placeholder="sajat@example.com"
            value={currentUserEmail}
            onChange={(e) => setCurrentUserEmail(e.target.value)}
            required
            disabled={!!user?.primaryEmailAddress?.emailAddress}
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isSending}
          className="w-full sm:w-auto"
        >
          {isSending ? 'Küldés...' : 'Küldés mindkét címre'}
        </Button>
      </form>
    </div>
  );
}
