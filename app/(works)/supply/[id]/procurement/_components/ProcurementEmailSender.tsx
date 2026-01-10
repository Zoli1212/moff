'use client';

import { useState, useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProcurementEmailTemplate, saveProcurementEmailTemplate } from "@/actions/user-actions";

interface AddressData {
  address: string;
  city: string;
  zip: string;
  country: string;
}

interface Material {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

export default function ProcurementEmailSender({
  materials,
  addressData,
  requestType,
  supplierEmail
}: {
  materials: Material[];
  addressData: AddressData;
  requestType: "quote" | "order";
  supplierEmail: string;
}) {
  const [recipientEmail, setRecipientEmail] = useState(supplierEmail || "");
  const [isSending, setIsSending] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");

  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch saved template with React Query
  const { data: templateData } = useQuery({
    queryKey: ['procurement-email-template'],
    queryFn: getProcurementEmailTemplate,
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
  });

  // Mutation for saving template
  const saveTemplateMutation = useMutation({
    mutationFn: saveProcurementEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-email-template'] });
      toast.success("Sablon sikeresen mentve!");
    },
    onError: () => {
      toast.error("Hiba történt a sablon mentésekor");
    },
  });

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setCurrentUserEmail(user.primaryEmailAddress.emailAddress || "");
    }
    if (supplierEmail) {
      setRecipientEmail(supplierEmail);
    }
  }, [user, supplierEmail]);

  // Set email template when data loads
  useEffect(() => {
    if (templateData && templateData.length > 0) {
      setEmailTemplate(templateData);
    } else {
      // Generate default template
      const deliveryAddressText = `${addressData.zip} ${addressData.city}, ${addressData.address}${addressData.country ? `, ${addressData.country}` : ''}`;
      const defaultTemplate = `${requestType === "quote" ? "Ajánlatkérés" : "Megrendelés"} anyagbeszerzéshez

Szállítási cím: ${deliveryAddressText}

A részletes anyaglista a csatolmányban található.

Köszönjük!`;
      setEmailTemplate(defaultTemplate);
    }
  }, [templateData, addressData, requestType]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Request details sheet
    const requestDetails = [
      [requestType === "quote" ? "Ajánlatkérés" : "Megrendelés"],
      [""],
      ["Szállítási cím:"],
      ["Irányítószám:", addressData.zip],
      ["Város:", addressData.city],
      ["Utca, házszám:", addressData.address],
      ["Ország:", addressData.country],
      [""],
      ["Létrehozva:", new Date().toLocaleString('hu-HU')],
    ];

    const wsRequest = XLSX.utils.aoa_to_sheet(requestDetails);

    if (!wsRequest['!merges']) wsRequest['!merges'] = [];
    wsRequest['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });

    // 2. Materials sheet
    const materialsData = [
      ["Anyag megnevezése", "Mennyiség", "Egység", "Egységár"],
      ...materials.map(item => [
        item.name,
        item.quantity,
        item.unit,
        item.unitPrice ? `${item.unitPrice.toLocaleString("hu-HU")} Ft` : ""
      ])
    ];

    const wsMaterials = XLSX.utils.aoa_to_sheet(materialsData);

    const colWidths = [
      { wch: 40 }, // Anyag megnevezése
      { wch: 10 }, // Mennyiség
      { wch: 10 }, // Egység
      { wch: 15 }, // Egységár
    ];

    wsMaterials['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsRequest, "Adatok");
    XLSX.utils.book_append_sheet(wb, wsMaterials, "Anyagok");

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

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
          subject: requestType === "quote" ? "Ajánlatkérés anyagbeszerzéshez" : "Megrendelés anyagbeszerzéshez",
          text: emailTemplate,
          attachments: [{
            filename: `anyagbeszerzes-${Date.now()}.xlsx`,
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

  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate(emailTemplate);
  };

  const handleSendToBoth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail || !currentUserEmail) {
      toast.error("Kérjük, töltsd ki mindkét email címet!");
      return;
    }

    // Send to the supplier
    await sendEmail(recipientEmail, false);

    // Send to current user's email
    await sendEmail(currentUserEmail, true);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 12,
          color: "#333",
        }}
      >
        Email címek
      </h3>

      <form onSubmit={handleSendToBoth}>
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="recipientEmail"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 6,
              color: "#666",
            }}
          >
            Bolt email címe
          </label>
          <input
            id="recipientEmail"
            type="email"
            placeholder="bolt@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e9ecef",
              borderRadius: 6,
              fontSize: 14,
              color: "#333",
              backgroundColor: "#fff",
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="currentUserEmail"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 6,
              color: "#666",
            }}
          >
            Saját email címed
          </label>
          <input
            id="currentUserEmail"
            type="email"
            placeholder="sajat@example.com"
            value={currentUserEmail}
            onChange={(e) => setCurrentUserEmail(e.target.value)}
            required
            disabled={!!user?.primaryEmailAddress?.emailAddress}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e9ecef",
              borderRadius: 6,
              fontSize: 14,
              color: "#333",
              backgroundColor: user?.primaryEmailAddress?.emailAddress ? "#f8f9fa" : "#fff",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label
              htmlFor="emailTemplate"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#666",
              }}
            >
              Email szövege
            </label>
            <button
              type="button"
              onClick={handleSaveTemplate}
              style={{
                padding: "4px 10px",
                border: "1px solid #FE9C00",
                borderRadius: 4,
                backgroundColor: "#fff",
                color: "#FE9C00",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Sablon mentése
            </button>
          </div>
          <textarea
            id="emailTemplate"
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            required
            rows={8}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e9ecef",
              borderRadius: 6,
              fontSize: 14,
              color: "#333",
              backgroundColor: "#fff",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          style={{
            width: "100%",
            padding: "14px 20px",
            border: "2px solid #FE9C00",
            borderRadius: 8,
            backgroundColor: "#fff",
            color: "#FE9C00",
            fontWeight: 600,
            fontSize: 15,
            cursor: isSending ? "not-allowed" : "pointer",
            opacity: isSending ? 0.5 : 1,
            transition: "all 0.2s",
          }}
        >
          {isSending ? 'Küldés...' : 'Email küldése mindkét címre'}
        </button>
      </form>
    </div>
  );
}
