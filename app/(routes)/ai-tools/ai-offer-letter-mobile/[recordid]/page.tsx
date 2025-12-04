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
import * as React from "react";

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
      /^(.*?)[:\-–—\s]*([\d\s,.]+)\s*(m²|fm|db)\s*[xX×]\s*([\d\s,.]+)\s*Ft\/\3\s*\(díj\)\s*\+\s*([\d\s,.]+)\s*Ft\/\3\s*\(anyag\)\s*=\s*([\d\s,.]+)\s*Ft\s*\(díj összesen\)\s*\+\s*([\d\s,.]+)\s*Ft\s*\(anyag összesen\)/i
    );

    if (match) {
      const [
        ,
        name,
        qty,
        unit,
        laborUnit,
        materialUnit,
        laborTotal,
        materialTotal,
      ] = match;
      items.push({
        name: name.trim(),
        quantity: qty.trim(),
        unit: unit.trim(),
        workUnitPrice:
          parseInt(laborUnit.replace(/\s|,/g, ""), 10).toLocaleString("hu-HU") +
          " Ft",
        materialUnitPrice:
          parseInt(materialUnit.replace(/\s|,/g, ""), 10).toLocaleString(
            "hu-HU"
          ) + " Ft",
        workTotal: laborTotal.trim() + " Ft",
        materialTotal: materialTotal.trim() + " Ft",
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

  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const saveOfferIfNeeded = async () => {
      // Don't proceed if we're already saving, have already saved, or if it was saved before
      if (isSavingRef.current || hasSavedRef.current || isAlreadySaved) {
        console.log(
          "Save skipped - already saving/saved in this session or was saved before"
        );
        return;
      }

      if (!offer || !recordid) {
        console.log("Save aborted - missing offer or recordid");
        return;
      }

      const contentToSave =
        typeof offer.content === "string"
          ? offer.content
          : offer.content?.output?.[0]?.content;

      if (!contentToSave) {
        console.log("Save aborted - no content to save");
        return;
      }

      // Mark that we're starting the save process
      isSavingRef.current = true;
      console.log("Starting save process...", {
        recordid,
        contentLength: contentToSave.length,
        demandTextLength: demandText?.length || 0,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await saveOfferWithRequirements({
          recordId: recordid,
          demandText: demandText || "",
          offerContent: contentToSave,
        });

        if (!result.success) {
          console.error(
            "Save failed:",
            "error" in result ? result.error : "Unknown error"
          );
          isSavingRef.current = false;
          toast.error(
            "error" in result
              ? result.error
              : "Hiba történt az ajánlat mentésekor"
          );
          router.push("/offers");
          return;
        }

        console.log(" Save successful");
        // Save to localStorage that this offer was saved with expiration
        // if (typeof window !== "undefined" && recordid) {
        //   saveOfferStatus(recordid);
        // }

        hasSavedRef.current = true;
        setHasSaved(true);
        setIsAlreadySaved(true);
        toast.success("Ajánlat sikeresen mentve!");
      } catch (error) {
        console.error("Error during save:", error);
        isSavingRef.current = false;
        toast.error("Váratlan hiba történt");
        router.push("/offers");
      }
    };

    // Only start saving if we have all required data and it wasn't saved before
    if (offer && recordid && !isAlreadySaved) {
      console.log("🔍 Found offer and recordid, checking if save is needed...");
      saveOfferIfNeeded();
    }
  }, [offer, recordid, isAlreadySaved]); // Add isAlreadySaved to dependencies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin w-12 h-12" />
      </div>
    );
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
  ⚠️ FONTOS: Ez egy KIEGÉSZÍTÉS egy meglévő ajánlathoz!
  
  SZIGORÚ SZABÁLYOK a kiegészítés kezeléséhez:
  
  1️⃣ **Ha a kiegészítés egy MEGLÉVŐ tételre vonatkozik:**
     - NE hozz létre új tételt!
     - Módosítsd a meglévő tétel mennyiségét, árát vagy leírását
     - Példa: Ha "WC felszerelés" már létezik és a kiegészítés "2 db WC helyett 3 db", akkor a meglévő tételt frissítsd 3 db-ra
  
  2️⃣ **Ha a kiegészítés REDUNDÁNS lenne egy meglévő tétellel:**
     - NE hozz létre duplikált tételt!
     - Frissítsd a releváns meglévő tételt az új információkkal
     - Példa: Ha "Zuhanyzó felszerelés" már létezik és a kiegészítés "Zuhanyzó (anyag)", akkor a meglévő tételt frissítsd az anyag információval
  
  3️⃣ **Ha a kiegészítés TELJESEN ÚJ dologra vonatkozik:**
     - Csak akkor adj hozzá új tételt, ha NEM kapcsolódik egyetlen meglévő tételhez sem
     - Ellenőrizd, hogy valóban új tétel-e, nem csak egy meglévő tétel pontosítása
     - Példa: Ha "Mosdó (anyag)" már létezik és a kiegészítés "Kád felszerelés", akkor ez új tétel
  
  4️⃣ **Érintetlen tételek:**
     - Minden olyan meglévő tételt, amit a kiegészítés NEM érint, hagyd változatlanul!
     - Ne módosítsd, ne töröld, ne duplikáld őket!
  
  ═══════════════════════════════════════════════════════════════
  
  Eredeti ajánlatkérés:
  ${originalRequest}
  
  Meglévő tételek (NE duplikáld őket!):
  ${existingItemsText}
  
  Kiegészítő információk (elemezd, hogy melyik szabály vonatkozik rá):
  ${newInfo}
  
  ═══════════════════════════════════════════════════════════════
  
  FELADATOD:
  1. Elemezd a kiegészítő információkat
  2. Döntsd el minden új információról, hogy melyik szabály (1️⃣, 2️⃣, 3️⃣, 4️⃣) vonatkozik rá
  3. Alkalmazd a megfelelő szabályt
  4. Add vissza a TELJES ajánlatot (módosított + érintetlen tételekkel együtt)
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
            router.push(`/ai-tools/ai-offer-letter/${recordId}`);
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

  const updateItemField = (
    idx: number,
    field: keyof TableItem,
    value: string
  ) => {
    const newItems = [...editableItems];
    newItems[idx][field] = value;

    // Ha quantity vagy árak változtak, számoljuk újra
    if (["quantity", "materialUnitPrice", "workUnitPrice"].includes(field)) {
      const quantity = parseFloat(newItems[idx].quantity) || 0;
      const materialPrice = parseCurrency(newItems[idx].materialUnitPrice);
      const workPrice = parseCurrency(newItems[idx].workUnitPrice);

      newItems[idx].materialTotal =
        (quantity * materialPrice).toLocaleString("hu-HU") + " Ft";
      newItems[idx].workTotal =
        (quantity * workPrice).toLocaleString("hu-HU") + " Ft";
    }

    setEditableItems(newItems);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="flex  items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/offers")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
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

      <div className="max-w-md mx-auto bg-white rounded-lg shadow">
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

              <pre className="whitespace-pre-wrap p-2 text-sm mb-4 bg-gray-50 rounded">
                {rawText}
              </pre>
              {/* Asztali táblázat */}
              <table className="hidden md:table w-full text-sm border mb-8">
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
                          onChange={(e) =>
                            updateItemField(idx, "name", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(idx, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.unit}
                          onChange={(e) =>
                            updateItemField(idx, "unit", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.materialUnitPrice}
                          onChange={(e) =>
                            updateItemField(
                              idx,
                              "materialUnitPrice",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded"
                          value={item.workUnitPrice}
                          onChange={(e) =>
                            updateItemField(
                              idx,
                              "workUnitPrice",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="p-2 border">{item.materialTotal}</td>
                      <td className="p-2 border">{item.workTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobil stacked nézet */}
              <div className="space-y-1 md:hidden px-1">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="max-w-md border rounded p-3 shadow-sm bg-white"
                  >
                    <div className="mb-2">
                      <textarea
                        rows={2}
                        className="w-auto p-1 rounded text-sm font-medium resize-none bg-white"
                        value={item.name}
                        onChange={(e) =>
                          updateItemField(idx, "name", e.target.value)
                        }
                        style={{ minHeight: "2.5rem" }}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="text-gray-600 flex items-center">
                        Mennyiség:
                      </div>
                      <input
                        type="text"
                        className="max-w-md p-1 border rounded text-xs bg-white"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemField(idx, "quantity", e.target.value)
                        }
                      />

                      <div className="text-gray-600 flex items-center">
                        Egység:
                      </div>
                      <input
                        type="text"
                        className="max-w-md p-1 border rounded text-xs bg-white"
                        value={item.unit}
                        onChange={(e) =>
                          updateItemField(idx, "unit", e.target.value)
                        }
                      />

                      <div className="text-gray-600 flex items-center">
                        Anyag egységár:
                      </div>
                      <input
                        type="text"
                        className="max-w-md p-1 border rounded text-xs text-left bg-white"
                        value={item.materialUnitPrice}
                        onChange={(e) =>
                          updateItemField(
                            idx,
                            "materialUnitPrice",
                            e.target.value
                          )
                        }
                      />

                      <div className="text-gray-600 flex items-center">
                        Díj egységár:
                      </div>
                      <input
                        type="text"
                        className="max-w-md p-1 border rounded text-xs text-left bg-white"
                        value={item.workUnitPrice}
                        onChange={(e) =>
                          updateItemField(idx, "workUnitPrice", e.target.value)
                        }
                      />

                      <div className="text-gray-600 flex items-center">
                        Anyag összesen:
                      </div>
                      <div className="text-left text-xs font-medium p-1">
                        {item.materialTotal}
                      </div>

                      <div className="text-gray-600 flex items-center">
                        Díj összesen:
                      </div>
                      <div className="text-left text-xs font-medium p-1">
                        {item.workTotal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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
