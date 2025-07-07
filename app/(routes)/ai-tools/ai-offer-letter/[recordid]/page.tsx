"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit, Save, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dynamic from "next/dynamic";
import { useDemandStore } from "@/store/offerLetterStore";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveOfferWithRequirements } from "@/actions/offer-actions";
import * as React from 'react'


// Dynamically import the OfferLetterEmailSender component with SSR disabled
const OfferLetterEmailSender = dynamic(
  () => import("./_components/OfferLetterEmailSender"),
  { ssr: false }
);

interface OutputItem {
  role: string;
  type: string;
  content: string;
}

interface OfferContent {
  output?: OutputItem[];
  text?: string;
}

interface OfferData {
  id: string;
  recordId: string;
  content: string | OfferContent;
  output?: OutputItem[];
  createdAt: string;
  metaData?: {
    title?: string;
    description?: string;
  };
}

const parseContent = (content: string | OfferContent): OfferContent | null => {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return { output: [{ role: "assistant", type: "text", content }] };
    }
  }
  return content;
};

const parseOfferTable = (text: string) => {
  const items = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim().replace(/^\*+/, "");

    const match = trimmed.match(
      /^(.+?):\s*([\d\s,.]+)\s*(m²|fm|db)\s*[×xX]\s*([\d\s,.]+)\s*Ft\/\3\s*\(díj\)\s*\+\s*([\d\s,.]+)\s*Ft\/\3\s*\(anyag\)\s*=\s*([\d\s,.]+)\s*Ft\s*\(díj összesen\)\s*\+\s*([\d\s,.]+)\s*Ft\s*\(anyag összesen\)/i
    );

    if (match) {
      const [
        _,
        name,
        qty,
        unit,
        laborUnitPrice,
        materialUnitPrice,
        laborTotal,
        materialTotal
      ] = match;

      console.log(_)

      items.push({
        name: (name ?? '').trim(),
        quantity: (qty ?? '').trim(),
        unit: (unit ?? '').trim(),
        workUnitPrice: (laborUnitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialUnitPrice: (materialUnitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        workTotal: (laborTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialTotal: (materialTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft'
      });
    }
  }

  return items;
};




export default function OfferLetterResult() {
  const router = useRouter();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<OfferContent | null>(null);
  const { demandText, setDemandText } = useDemandStore();
  const [editableItems, setEditableItems] = useState<TableItem[]>([]);
  const { setStoredItems } = useDemandStore();
  const storedItemsRef = useRef<TableItem[]>([]);
  const paramsurl = useParams();
  const recordid = paramsurl.recordid?.toString();
  const [hasSaved, setHasSaved] = useState(false);
  const hasSavedRef = useRef(false);
  const [newText, setNewText] = useState("");

  console.log(hasSaved, "hasSaved");

  interface TableItem {
    name: string;
    quantity: string;
    unit: string;
    materialUnitPrice: string;
    workUnitPrice: string;
    materialTotal: string;
    workTotal: string;
  }

  // Initialize with empty item if no items are loaded
  useEffect(() => {
    const initializeItems = () => {
      if (editableItems.length === 0) {
        const parsedItems = content?.output?.[0]?.content
          ? parseOfferTable(content.output[0].content)
          : [];

        if (parsedItems.length === 0) {
          // Add an empty item if no items were parsed
          setEditableItems([
            {
              name: "",
              quantity: "1",
              unit: "db",
              materialUnitPrice: "0 Ft",
              workUnitPrice: "0 Ft",
              materialTotal: "0 Ft",
              workTotal: "0 Ft",
            },
          ]);
        } else {
          setEditableItems(parsedItems);
        }
      }
    };

    initializeItems();
  }, [content]);

  // minden szerkesztés után frissítjük a store-t
  useEffect(() => {
    setStoredItems(editableItems);
  }, [editableItems]);

  // Helper function to parse currency values
  const parseCurrency = (value: string): number => {
    // Remove all non-numeric characters except decimal point and minus
    const numericValue = value.replace(/[^0-9,-]+/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  // Calculate work costs total
  const calculateWorkTotal = useMemo(() => {
    return editableItems.reduce((sum, item) => {
      return sum + parseCurrency(item.workTotal);
    }, 0);
  }, [editableItems]);

  // Calculate material costs total
  const calculateMaterialTotal = useMemo(() => {
    return editableItems.reduce((sum, item) => {
      return sum + parseCurrency(item.materialTotal);
    }, 0);
  }, [editableItems]);

  // Calculate total (work + material costs)
  const calculateTotal = useMemo(() => {
    return calculateWorkTotal + calculateMaterialTotal;
  }, [calculateWorkTotal, calculateMaterialTotal]);

  // Format values as strings
  const formattedWorkTotal = useMemo(() => {
    return calculateWorkTotal.toLocaleString("hu-HU") + " Ft";
  }, [calculateWorkTotal]);

  const formattedMaterialTotal = useMemo(() => {
    return calculateMaterialTotal.toLocaleString("hu-HU") + " Ft";
  }, [calculateMaterialTotal]);

  const formattedTotal = useMemo(() => {
    return calculateTotal.toLocaleString("hu-HU") + " Ft";
  }, [calculateTotal]);
  useEffect(() => {
    if (offer) {
      const parsed = parseContent(offer.content);
      setContent(parsed);

      if (parsed?.output?.[0]?.content) {
        const rawText = parsed.output[0].content;
        const parsedItems = parseOfferTable(rawText);

        // Első alkalommal beállítjuk a ref-et, ha még nincs benne érték
        if (storedItemsRef.current.length === 0) {
          storedItemsRef.current = parsedItems;
          setEditableItems(parsedItems);
          setStoredItems(parsedItems);
          return;
        }

        if (parsedItems.length < 5 && storedItemsRef.current.length >= 10) {
          const uniqueNewItems = parsedItems.filter(
            (newItem) =>
              !storedItemsRef.current.some(
                (existingItem) =>
                  existingItem.name === newItem.name &&
                  existingItem.quantity === newItem.quantity &&
                  existingItem.unit === newItem.unit &&
                  existingItem.materialUnitPrice ===
                    newItem.materialUnitPrice &&
                  existingItem.workUnitPrice === newItem.workUnitPrice &&
                  existingItem.materialTotal === newItem.materialTotal &&
                  existingItem.workTotal === newItem.workTotal
              )
          );

          const mergedItems = [...storedItemsRef.current, ...uniqueNewItems];

          storedItemsRef.current = mergedItems;
          setEditableItems(mergedItems);
          setStoredItems(mergedItems);
        } else {
          storedItemsRef.current = parsedItems;
          setEditableItems(parsedItems);
          setStoredItems(parsedItems);
        }
      }
    }
  }, [offer]);

  useEffect(() => {
    console.log("🔍 storedItemsRef jelenlegi érték:", storedItemsRef.current);
  }, [editableItems]);


  useEffect(() => {
    const fetchOffer = async () => {
      if (!recordid) return;
  
      try {
        const response = await axios.get(`/api/ai-offer-letter/${recordid}`);
        console.log(response.data, "DATA");
        setOffer(response.data);
      } catch (error) {
        console.error("Error fetching offer:", error);
        toast.error("Hiba történt az ajánlat betöltésekor");
        setError(
          "Nem sikerült betölteni az ajánlatot. Kérjük próbáld újra később."
        );
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchOffer();
  }, [recordid]);

  // Track if we've started saving
  const isSavingRef = useRef(false);
  
  // Check localStorage to see if this offer was already saved and not expired
  const getSavedStatus = () => {
    if (typeof window === 'undefined') return false;
    
    const savedOffers = JSON.parse(localStorage.getItem('savedOffers') || '{}');
    const savedData = savedOffers[recordid || ''];
    
    // If no saved data or no expiration, consider it not saved
    if (!savedData) return false;
    
    // Check if the saved data has expired (7 days)
    const now = Date.now();
    if (savedData.expires && savedData.expires < now) {
      // Remove expired entry
      delete savedOffers[recordid || ''];
      localStorage.setItem('savedOffers', JSON.stringify(savedOffers));
      console.log('🗑️ Removed expired save status for offer:', recordid);
      return false;
    }
    
    return !!savedData.saved;
  };
  
  // Save offer status with 7-day expiration
  const saveOfferStatus = (recordId: string) => {
    if (typeof window === 'undefined') return;
    
    const savedOffers = JSON.parse(localStorage.getItem('savedOffers') || '{}');
    savedOffers[recordId] = {
      saved: true,
      savedAt: new Date().toISOString(),
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
    localStorage.setItem('savedOffers', JSON.stringify(savedOffers));
    console.log('💾 Saved offer status with expiration:', recordId);
  };

  const [isAlreadySaved, setIsAlreadySaved] = useState(false);

  // Check saved status on component mount
  useEffect(() => {
    if (recordid) {
      const saved = getSavedStatus();
      setIsAlreadySaved(saved);
      console.log("Checked saved status:", { recordid, saved });
    }
  }, [recordid]);

  useEffect(() => {
    const saveOfferIfNeeded = async () => {
      // Don't proceed if we're already saving, have already saved, or if it was saved before
      if (isSavingRef.current || hasSavedRef.current || isAlreadySaved) {
        console.log('Save skipped - already saving/saved in this session or was saved before');
        return;
      }

      if (!offer || !recordid) {
        console.log('Save aborted - missing offer or recordid');
        return;
      }
      
      const contentToSave = typeof offer.content === "string"
        ? offer.content
        : offer.content?.output?.[0]?.content;
  
      if (!contentToSave) {
        console.log('❌ Save aborted - no content to save');
        return;
      }

      // Mark that we're starting the save process
      isSavingRef.current = true;
      console.log('💾 Starting save process...', {
        recordid,
        contentLength: contentToSave.length,
        demandTextLength: demandText?.length || 0,
        timestamp: new Date().toISOString()
      });
  
      try {
        const result = await saveOfferWithRequirements({
          recordId: recordid,
          demandText: demandText || '',
          offerContent: contentToSave,
        });
  
        if (result.success) {
          console.log('Save successful');
          // Save to localStorage that this offer was saved with expiration
          if (typeof window !== 'undefined' && recordid) {
            saveOfferStatus(recordid);
          }
          
          hasSavedRef.current = true;
          setHasSaved(true);
          setIsAlreadySaved(true);
          toast.success("Ajánlat sikeresen mentve!");
        } else {
          console.error('❌ Save failed:', result);
          isSavingRef.current = false;
          toast.error("Hiba történt az ajánlat mentésekor");
        }
      } catch (error) {
        console.error('❌ Error during save:', error);
        isSavingRef.current = false;
        toast.error("Váratlan hiba történt");
      }
    };
  
    // Only start saving if we have all required data and it wasn't saved before
    if (offer && recordid && !isAlreadySaved) {
      console.log('🔍 Found offer and recordid, checking if save is needed...');
      saveOfferIfNeeded();
    }
  }, [offer, recordid, isAlreadySaved]); // Add isAlreadySaved to dependencies
  
  

  if (isLoading) {
    return <Loader2 className="animate-spin" />;
  }
  const rawText = content?.output?.[0]?.content || "";
  // Use editableItems instead of parsing raw text each time
  const items = editableItems;

  // Extract email - simple pattern for this specific case
  // Email - matches the email format in the signature
  const emailMatch = rawText.match(
    /(?<=\n\nÜdvözlettel,)\s*\n\s*([^\n]+@[^\s]+)/i
  );

  // Name - matches "Kedves [Name]!" at the beginning
  const nameMatch = rawText.match(/^Kedves\s+([^!]+)!/i);

  // Time estimate - matches "Becsült kivitelezési idő: 15-20 nap"
  const timeMatch = rawText.match(
    /Becsült kivitelezési idő:\s*(\d+(?:[-–]\d+)?)/i
  );

  function buildPromptWithItems(
    existingItemsText: string,
    newInfo: string,
    originalRequest: string
  ) {
    return `
  Ez az ajánlatkérés kiegészítése.
  
  Kérem, hogy az alábbi új információk és az eredeti ajánlatkérés alapján egészítsd ki az ajánlatot új tételekkel vagy pontosításokkal, de a lent felsorolt meglévő tételeket változatlanul tartsd meg!
  
  Ha korábban feltett kérdésekre nem érkezett válasz (pl. anyagminőség, kivitelezési részletek), kérlek az új információkkal együtt azokra is térj ki.
  
  Eredeti ajánlatkérés:
  ${originalRequest}
  
  Meglévő tételek:
  ${existingItemsText}
  
  Kiegészítő információk:
  ${newInfo}
  `;
  }

  const handleResend = async () => {
    if (!newText.trim()) {
      const errorMsg = "Kérjük adj meg egy szöveget az elemzéshez!";
      console.log("Validation error:", errorMsg);
      setError(errorMsg);
      return;
    }

    setIsSending(true);
    setError("");

    try {
      // Get the original request text from the store
      // const combinedText = `Eredeti ajánlatkérés: ${offerText}\n\n${"Kérem az ajánlatot az eredeti ajánlatkérés és a kiegészítő válaszok együttes figyelembevételével!\n\nKiegészítő válaszok:" + newText}`;
      const formattedItems = editableItems
        .map(
          (item) =>
            `* ${item.name}: ${item.quantity} ${item.unit} × ${item.workUnitPrice} = ${item.workTotal}`
        )
        .join("\n");

      const combinedText = buildPromptWithItems(
        formattedItems,
        newText,
        demandText
      );

      setDemandText(combinedText);

      // Update the store with the combined text first

      // Create a new record ID
      const recordId = uuidv4();

      // Send the combined text to the API
      const formData = new FormData();
      formData.append("recordId", recordId);
      formData.append("textContent", combinedText);
      formData.append("type", "offer-letter");

      const result = await axios.post("/api/ai-demand-agent", formData);
      const { eventId } = result.data;
      console.log("Event queued:", eventId);

      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        try {
          const res = await axios.get(
            `/api/ai-demand-agent/status?eventId=${eventId}`
          );
          const { status } = res.data;
          console.log("Status:", status);

          if (status === "Completed") {
            setIsSending(false);
            // Only redirect after processing is complete
            router.push(`/ai-tools/ai-offer-letter-mobile/${recordId}`);
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setIsSending(false);
            setError("Az elemzés nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setIsSending(false);
          setError("Hiba történt az állapot lekérdezése során.");
        }
      };

      storedItemsRef.current = editableItems;
      setStoredItems(editableItems);

      poll();
    } catch (err) {
      console.error("Error resending request:", err);
      setError("Hiba történt az újraküldés során. Kérjük próbáld újra később.");
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/ai-tools/ai-offer-letter")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>

        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSending}
              >
                <X className="mr-2 h-4 w-4" />
                Mégse
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleResend}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Kiegészítés és újragenerálás
              </Button>
            </>
          ) : (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export to Excel
                  const wb = XLSX.utils.book_new();

                  // Create data for the items sheet
                  const itemsData = [
                    [
                      "Tétel megnevezése",
                      "Mennyiség",
                      "Egység",
                      "Anyag egységár",
                      "Díj egységár",
                      "Anyag összesen",
                      "Díj összesen",
                    ],
                    ...editableItems.map((item) => [
                      item.name,
                      item.quantity,
                      item.unit,
                      item.materialUnitPrice,
                      item.workUnitPrice,
                      item.materialTotal,
                      item.workTotal,
                    ]),
                  ];

                  // Add summary rows
                  itemsData.push([
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Munkadíj összesen:",
                    formattedWorkTotal,
                  ]);
                  itemsData.push([
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Anyagköltség összesen:",
                    formattedMaterialTotal,
                  ]);
                  itemsData.push([
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Összesített nettó költség:",
                    formattedTotal,
                  ]);

                  if (timeMatch) {
                    itemsData.push([
                      "",
                      "",
                      "",
                      "",
                      "",
                      "Becsült kivitelezési idő:",
                      `${timeMatch[1].trim()} munkanap`,
                    ]);
                  }

                  // Create worksheet
                  const wsItems = XLSX.utils.aoa_to_sheet(itemsData);

                  // Set column widths
                  const colWidths = [
                    { wch: 40 }, // Tétel megnevezése
                    { wch: 10 }, // Mennyiség
                    { wch: 8 }, // Egység
                    { wch: 15 }, // Anyag egységár
                    { wch: 15 }, // Díj egységár
                    { wch: 20 }, // Anyag összesen
                    { wch: 20 }, // Díj összesen
                  ];
                  wsItems["!cols"] = colWidths;

                  // Add worksheet to workbook
                  XLSX.utils.book_append_sheet(wb, wsItems, "Ajánlat");

                  // Generate Excel file
                  XLSX.writeFile(
                    wb,
                    `ajanlat-${new Date().toISOString().split("T")[0]}.xlsx`
                  );
                }}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel letöltése
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                További információ
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Generált Ajánlat</h1>

        {offer && content ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="border-b pb-4 mb-6">
                <h1 className="text-xl font-semibold">Ajánlat</h1>
                {offer.metaData?.description && (
                  <p className="text-gray-600 mt-1 truncate">
                    Tárgy: {offer.metaData.description}
                  </p>
                )}
              </div>

              {isEditing ? (
                <div className="mb-4">
                  <Textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="Írd ide a kiegészítéseket, amit hozzá szeretnél adni a kéréshez..."
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>
              ) : null}

              <pre className="whitespace-pre-wrap text-sm mb-4 bg-gray-50 p-4 rounded">
                {rawText}
              </pre>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2 border">Tétel megnevezése</th>
                    <th className="text-left p-2 border">Mennyiség</th>
                    <th className="text-left p-2 border">Egység</th>
                    <th className="text-left p-2 border">Anyag egységár</th>
                    <th className="text-left p-2 border">Díj egységár</th>
                    <th className="text-left p-2 border">Anyag összesen</th>
                    <th className="text-left p-2 border">Díj összesen</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[idx].name = e.target.value;
                            setEditableItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[idx].quantity = e.target.value;
                            // Recalculate total if needed
                            const quantity = parseFloat(e.target.value) || 0;
                            const workPrice = parseCurrency(item.workUnitPrice);
                            const materialPrice = parseCurrency(
                              item.materialUnitPrice
                            );

                            const workTotal = quantity * workPrice;
                            const materialTotal = quantity * materialPrice;

                            newItems[idx].workTotal =
                              workTotal.toLocaleString("hu-HU") + " Ft";
                            newItems[idx].materialTotal =
                              materialTotal.toLocaleString("hu-HU") + " Ft";

                            setEditableItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.unit}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[idx].unit = e.target.value;
                            setEditableItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.materialUnitPrice}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[idx].materialUnitPrice = e.target.value;
                            // Recalculate material total
                            const quantity = parseFloat(item.quantity) || 0;
                            const price = parseCurrency(e.target.value);
                            const total = quantity * price;
                            newItems[idx].materialTotal =
                              total.toLocaleString("hu-HU") + " Ft";
                            setEditableItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.workUnitPrice}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[idx].workUnitPrice = e.target.value;
                            // Recalculate work total
                            const quantity = parseFloat(item.quantity) || 0;
                            const price = parseCurrency(e.target.value);
                            const total = quantity * price;
                            newItems[idx].workTotal =
                              total.toLocaleString("hu-HU") + " Ft";
                            setEditableItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2 border">{item.materialTotal}</td>
                      <td className="p-2 border">{item.workTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem = {
                      name: "",
                      quantity: "1",
                      unit: "db",
                      materialUnitPrice: "0 Ft",
                      workUnitPrice: "0 Ft",
                      materialTotal: "0 Ft",
                      workTotal: "0 Ft",
                    };
                    setEditableItems([...editableItems, newItem]);
                  }}
                  className="flex items-center gap-1"
                >
                  <span>+</span> Új tétel hozzáadása
                </Button>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-base">
                  <span className="font-medium">Munkadíj összesen:</span>{" "}
                  {formattedWorkTotal}
                </p>
                <p className="text-base">
                  <span className="font-medium">Anyagköltség összesen:</span>{" "}
                  {formattedMaterialTotal}
                </p>
                <p className="text-base font-medium pt-2 border-t border-gray-200 ">
                  <strong>Összesített nettó költség:</strong> {formattedTotal}
                </p>
              </div>
              {timeMatch && (
                <p className="text-base font-medium">
                  Becsült kivitelezési idő: {timeMatch[1].trim()} munkanap
                </p>
              )}

              {nameMatch && (
                <p className="text-base text-gray-800">
                  Kérelmező neve:{" "}
                  <span className="font-medium">{nameMatch[1].trim()}</span>
                </p>
              )}
              {emailMatch && (
                <p className="text-base text-gray-800">
                  Kérelmező email:{" "}
                  <span className="font-medium">{emailMatch[0]}</span>
                </p>
              )}

              {/* Add the email sender component */}
              <div className="mt-8">
                <OfferLetterEmailSender
                  items={editableItems}
                  name={nameMatch?.[1]?.trim()}
                  email={emailMatch?.[0]}
                  total={formattedTotal}
                  time={timeMatch?.[1]?.trim()}
                  title={"Ajánlat "}
                />
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Létrehozva: {new Date(offer.createdAt).toLocaleString("hu-HU")}
              </p>
              <p className="text-sm text-gray-500">
                Ajánlat azonosító:{" "}
                <span className="font-mono">{offer.recordId}</span>
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">
                JSON Riport (nyers visszatérési érték):
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
                {JSON.stringify(offer.content, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p>{error || "Nincs megjeleníthető adat."}</p>
        )}
      </div>
    </div>
  );
}
