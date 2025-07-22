"use client";

import { useEffect, useState, useCallback } from "react";
import { updateOfferItems } from "@/actions/offer-actions";
import { toast } from "sonner";
import { RequirementDetail } from "./requirement-detail";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { OfferItem, OfferWithItems } from "@/types/offer.types";
import { useDemandStore } from "@/store/offerLetterStore";
import { useOfferItemCheckStore } from "@/store/offerItemCheckStore";
import dynamic from "next/dynamic";

// Dynamically import the email sender component to avoid SSR issues
const OfferLetterEmailSender = dynamic(
  () =>
    import(
      "@/app/(routes)/ai-tools/ai-offer-letter/[recordid]/_components/OfferLetterEmailSender"
    ),
  { ssr: false }
);
import {
  ArrowLeft,
  FileText,
  List,
  MessageSquare,
  Clock,
  Tag,
  Calendar,
  AlertCircle,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import TextInputDialogQuestions from "@/app/(routes)/dashboard/_components/TextInputDialogQuestions";
import SocialShareButtonsExcel from "./SocialShareButtonsExcel";

// Helper function to extract questions from description
function extractQuestions(description: string): string[] {
  if (!description) return [];

  // Először soronként vizsgálunk, minden kérdőjellel végződő sort felveszünk
  const lines = description.split(/\r?\n/);
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith("?")) {
      // Ha szám+pont/zárójel van elöl, azt levágjuk
      const match = trimmed.match(/^(\d+[.)]?\s*)(.*\?)$/);
      if (match) {
        questions.push(match[2].trim());
      } else {
        questions.push(trimmed);
      }
    }
  }

  // Ha így nincs kérdés, próbáljuk mondatonként is, hátha egy sorban több kérdés van
  if (questions.length === 0) {
    const sentences = description.split(/(?<=[.!?])\s+/);
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.endsWith("?")) {
        questions.push(trimmed);
      }
    });
  }

  return questions;
}

interface OfferDetailViewProps {
  offer: OfferWithItems;
  onBack: () => void;
}

export function OfferDetailView({ offer, onBack }: OfferDetailViewProps) {
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: OfferItem;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItems, setOriginalItems] = useState<OfferItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);
  const { setDemandText } = useDemandStore();
  const { setOfferItems } = useOfferItemCheckStore();

  // Update the store whenever editableItems changes
  useEffect(() => {
    setOfferItems(editableItems);
  }, [editableItems, setOfferItems]);

  // Log items when they change
  useEffect(() => {
    console.log("Current items:", JSON.stringify(editableItems, null, 2));
    console.log(originalItems.length);
  }, [editableItems]);

  // Initialize items
  useEffect(() => {
    if (offer.items) {
      const items = Array.isArray(offer.items) ? offer.items : [];
      // Ensure all items have the required fields

      for (let i = 0; i < offer.items.length; i++) {
        console.log(offer.items[i], "+");
      }
      const validatedItems = items.map((item, index) => ({
        id: index, // Add unique id for each item
        name: item.name || "",
        quantity: item.quantity || "1",
        unit: item.unit || "db",
        materialUnitPrice: item.materialUnitPrice || "0 Ft",
        unitPrice: item.unitPrice || "0 Ft",
        materialTotal: item.materialTotal || "0 Ft",
        workTotal: item.workTotal || "0 Ft",
      }));
      setEditableItems(validatedItems);
      // Store original items with their indices
      setOriginalItems(validatedItems);
    }
  }, [offer.items]);

  // Parse currency values
  const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/[^0-9,-]+/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

  // Format number with space as thousand separator
  const formatNumberWithSpace = (
    value: string | number | null | undefined
  ): string => {
    if (value === null || value === undefined) return "";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/\s+/g, "").replace(",", ".")) || 0
        : value;
    return num.toLocaleString("hu-HU", {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
  };

  // // Handle item field change
  // const handleItemChange = (index: number, field: string, value: string) => {
  //   const newItems = [...editableItems];
  //   const item = { ...newItems[index], [field]: value };

  //   // Recalculate totals if quantity or prices change
  //   if (["quantity", "materialUnitPrice", "workUnitPrice"].includes(field)) {
  //     const quantity = parseFloat(item.quantity) || 0;
  //     const materialUnitPrice = parseCurrency(item.materialUnitPrice);
  //     const workUnitPrice = parseCurrency(item.workUnitPrice);

  //     item.materialTotal = formatCurrency(quantity * materialUnitPrice);
  //     item.workTotal = formatCurrency(quantity * workUnitPrice);
  //   }

  //   newItems[index] = item;
  //   setEditableItems(newItems);
  // };

  // Add new item
  const handleAddItem = () => {
    const newItem = {
      id: Date.now(), // Use timestamp as temporary ID
      name: "",
      quantity: "1",
      unit: "db",
      materialUnitPrice: "0 Ft",
      unitPrice: "0 Ft",
      materialTotal: "0 Ft",
      workTotal: "0 Ft",
    };

    const updatedItems = [...editableItems, newItem];
    const newItemIndex = updatedItems.length - 1;
    setEditableItems(updatedItems);
    setEditingItem({
      index: newItemIndex,
      item: updatedItems[newItemIndex],
    });

    // Scroll to the new item
    setTimeout(() => {
      const element = document.getElementById(`item-${newItem.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newItems = [...editableItems];
    newItems.splice(index, 1);
    setEditableItems(newItems);
  };

  // Start editing an item in modal
  const startEditing = (index: number) => {
    setEditingItem({ index, item: { ...editableItems[index] } });
    setIsModalOpen(true);
  };

  // Handle modal input changes
  const handleModalChange = (field: string, value: string) => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem.item, [field]: value };

    // Recalculate totals if quantity or prices change
    if (["quantity", "materialUnitPrice", "unitPrice"].includes(field)) {
      const quantity = parseFloat(updatedItem.quantity) || 0;
      const materialUnitPrice = parseCurrency(
        updatedItem.materialUnitPrice || "0"
      );
      const workUnitPrice = parseCurrency(updatedItem.unitPrice || "0");

      updatedItem.materialTotal = formatCurrency(quantity * materialUnitPrice);
      updatedItem.workTotal = formatCurrency(quantity * workUnitPrice);
    }

    setEditingItem({ ...editingItem, item: updatedItem });
  };

  // Save the item from modal
  const saveItem = async () => {
    if (!editingItem) return;

    const { index, item } = editingItem;

    if (!item.name || !item.quantity || !item.unit) {
      toast.error("Kérem töltse ki az összes kötelező mezőt");
      return;
    }

    setIsSaving(true);
    try {
      const newItems = [...editableItems];
      newItems[index] = item;

      const result = await updateOfferItems(
        parseInt(offer.id.toString()),
        newItems
      );

      if (result.success) {
        toast.success("A tétel sikeresen mentve");
        setEditableItems(newItems);
        setOriginalItems(newItems.map((item) => ({ ...item })));
        setIsModalOpen(false);
      } else {
        toast.error(result.error || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing in modal
  const cancelEditing = () => {
    setIsModalOpen(false);
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    return editableItems.reduce(
      (totals, item) => {
        return {
          material: totals.material + parseCurrency(item.materialTotal),
          work: totals.work + parseCurrency(item.workTotal),
          total:
            totals.total +
            parseCurrency(item.materialTotal) +
            parseCurrency(item.workTotal),
        };
      },
      { material: 0, work: 0, total: 0 }
    );
  }, [editableItems]);

  const {
    material: materialTotal,
    work: workTotal,
    total: grandTotal,
  } = calculateTotals();

  // Helper functions to extract name and email from title and description
  const extractName = (title?: string | null): string => {
    if (!title) return "";
    // Try to find a name in the title (assuming format like "Ajánlat - John Doe")
    const nameMatch = title.match(/[-:]\s*([^\n,]+)/);
    return nameMatch ? nameMatch[1].trim() : title;
  };

  const extractEmail = (description?: string | null): string => {
    if (!description) return "";
    // Try to find an email in the description
    const emailMatch = description.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    );
    return emailMatch ? emailMatch[0] : "";
  };

  // Debug: log the requirement object
  useEffect(() => {
    console.log("Requirement object:", offer.requirement);
    console.log("Requirement description:", offer.requirement?.description);
  }, [offer.requirement]);

  // Ensure notes is always an array of strings
  const notes = Array.isArray(offer.notes) ? offer.notes : [];

  // Always use editableItems
  const items = editableItems;

  // Format price with Hungarian locale
  const formatPrice = (price: number | string) => {
    if (typeof price === "string") {
      return price;
    }
    return price.toLocaleString("hu-HU") + " Ft";
  };

  // Format date with Hungarian locale
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Nincs megadva";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Érvénytelen dátum"
        : format(date, "PPP", { locale: hu });
    } catch (e) {
      return `Érvénytelen dátum: ${(e as Error).message}`;
    }
  };

  function getStatusDisplay(status: string) {
    const statusMap: Record<string, string> = {
      draft: "Piszkozat",
      sent: "Elküldve",
      accepted: "Elfogadva",
      rejected: "Elutasítva",
      expired: "Lejárt",
    };

    return statusMap[status] || status;
  }

  if (showRequirementDetail && offer.requirement) {
    return (
      <RequirementDetail
        requirement={offer.requirement}
        onBack={() => setShowRequirementDetail(false)}
      />
    );
  }

  // Add print styles
  const printStyles = `
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      #printable-area, #printable-area * {
        visibility: visible;
      }
      #printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 10mm;
      }
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
        margin-bottom: 20px;
      }
      .print-table th, 
      .print-table td {
        border: 1px solid #e2e8f0;
        padding: 3px 5px;
        vertical-align: top;
      }
      .print-table th {
        background-color: #f8fafc;
        font-weight: 600;
        text-align: center;
      }
      .text-right {
        text-align: right !important;
      }
      .text-center {
        text-align: center !important;
      }
      .print-header {
        margin-bottom: 20px;
      }
      .print-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .print-meta {
        font-size: 12px;
        margin-bottom: 15px;
      }
      .print-section {
        margin-bottom: 20px;
      }
      .print-section-title {
        font-size: 14px;
        font-weight: bold;
        margin: 15px 0 10px 0;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
      }
    }
  `;

  // Function to handle print
  // const handlePrint = () => {
  //   const printWindow = window.open("", "", "width=1000,height=800");
  //   if (!printWindow) return;

  //   // Get the HTML for the print view
  //   const printContent = `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //       <title>${offer.title || "Ajánlat"}</title>
  //       <meta charset="utf-8">
  //       <style>${printStyles}</style>
  //     </head>
  //     <body>
  //       <div id="printable-area">
  //         <div class="print-header">
  //           <div class="print-title">${offer.title || "Ajánlat"}</div>
  //           <div class="print-meta">
  //             <div><strong>Státusz:</strong> ${getStatusDisplay(offer.status || "draft")}</div>
  //             <div><strong>Létrehozva:</strong> ${formatDate(offer.createdAt)}</div>
  //             ${offer.validUntil ? `<div><strong>Érvényes:</strong> ${formatDate(offer.validUntil)}</div>` : ""}
  //           </div>
  //         </div>

  //         ${
  //           offer.description
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Leírás</div>
  //             <div>${offer.description.replace(/\n/g, "<br>")}</div>
  //           </div>
  //         `
  //             : ""
  //         }

  //         ${
  //           items.length > 0
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Tételek</div>
  //             <table class="print-table">
  //               <thead>
  //                 <tr>
  //                   <th style="width: 5%;">#</th>
  //                   <th style="width: 25%;">Tétel megnevezése</th>
  //                   <th style="width: 8%;">Mennyiség</th>
  //                   <th style="width: 8%;">Egység</th>
  //                   <th style="width: 15%;">Anyag egységár</th>
  //                   <th style="width: 15%;">Díj egységár</th>
  //                   <th style="width: 12%;">Anyag összesen</th>
  //                   <th style="width: 12%;">Díj összesen</th>
  //                 </tr>
  //               </thead>
  //               <tbody>
  //                 ${items
  //                   .map(
  //                     (item, index) => `
  //                   <tr>
  //                     <td class="text-center">${index + 1}.</td>
  //                     <td>${item.name.replace(/^\*\s*/, "")}</td>
  //                     <td class="text-center">${item.quantity}</td>
  //                     <td class="text-center">${item.unit}</td>
  //                     <td class="text-right">${item.materialUnitPrice || "0 Ft"}</td>
  //                     <td class="text-right">${item.unitPrice || "0 Ft"}</td>
  //                     <td class="text-right">${item.materialTotal || "0 Ft"}</td>
  //                     <td class="text-right">${item.workTotal || "0 Ft"}</td>
  //                   </tr>
  //                 `
  //                   )
  //                   .join("")}
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Munkadíj összesen:</td>
  //                   <td colspan="4" class="text-right font-bold">${workTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Anyagköltség összesen:</td>
  //                   <td colspan="4" class="text-right font-bold">${materialTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //                 <tr>
  //                   <td colspan="4" class="text-right font-bold">Összesített nettó költség:</td>
  //                   <td colspan="4" class="text-right font-bold">${grandTotal.toLocaleString("hu-HU")} Ft</td>
  //                 </tr>
  //               </tbody>
  //             </table>
  //           </div>
  //         `
  //             : ""
  //         }

  //         ${
  //           notes.length > 0
  //             ? `
  //           <div class="print-section">
  //             <div class="print-section-title">Megjegyzések</div>
  //             <ul>
  //               ${notes.map((note) => `<li>• ${note}</li>`).join("")}
  //             </ul>
  //           </div>
  //         `
  //             : ""
  //         }
  //       </div>
  //     </body>
  //     </html>
  //   `;

  //   printWindow.document.open();
  //   printWindow.document.write(printContent);
  //   printWindow.document.close();

  //   // Wait for content to load before printing
  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.print();
  //       printWindow.close();
  //     }, 500);
  //   };
  // };

  return (
    <>
      <style>{printStyles}</style>
      <div className="flex flex-col h-full" id="printable-area">
        {/* Edit Item Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tétel szerkesztése</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Megnevezés
                </Label>
                <Input
                  id="name"
                  value={editingItem?.item.name || ""}
                  onChange={(e) => handleModalChange("name", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Mennyiség
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editingItem?.item.quantity || ""}
                  onChange={(e) =>
                    handleModalChange("quantity", e.target.value)
                  }
                  className="col-span-1"
                />
                <Label htmlFor="unit" className="text-right">
                  Egység
                </Label>
                <Input
                  id="unit"
                  value={editingItem?.item.unit || ""}
                  onChange={(e) => handleModalChange("unit", e.target.value)}
                  className="col-span-1"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="materialUnitPrice" className="text-right">
                  Anyag egységár
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="materialUnitPrice"
                    value={formatNumberWithSpace(
                      editingItem?.item.materialUnitPrice?.replace(/\s*Ft$/, "")
                    )}
                    onChange={(e) =>
                      handleModalChange(
                        "materialUnitPrice",
                        e.target.value.replace(/\s+/g, "")
                      )
                    }
                    className="text-right"
                  />
                  <span className="ml-2">Ft</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="workUnitPrice" className="text-right">
                  Díj egységár
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="workUnitPrice"
                    value={formatNumberWithSpace(
                      editingItem?.item.unitPrice?.replace(/\s*Ft$/, "")
                    )}
                    onChange={(e) =>
                      handleModalChange(
                        "unitPrice",
                        e.target.value.replace(/\s+/g, "")
                      )
                    }
                    className="text-right"
                  />
                  <span className="ml-2">Ft</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 pt-4 border-t">
                <Label className="text-right font-medium">Anyag összesen</Label>
                <div className="col-span-3 font-medium">
                  {formatNumberWithSpace(
                    editingItem?.item.materialTotal?.replace(/\s*Ft$/, "")
                  )}{" "}
                  Ft
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Díj összesen</Label>
                <div className="col-span-3 font-medium">
                  {formatNumberWithSpace(
                    editingItem?.item.workTotal?.replace(/\s*Ft$/, "")
                  )}{" "}
                  Ft
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Mégse
              </Button>
              <Button onClick={saveItem} disabled={isSaving}>
                {isSaving ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-6 flex-grow">
          {/* Header with back button */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Vissza az ajánlatokhoz
            </button>
          </div>

          {/* Offer Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {offer.title || "Ajánlat részletei"}
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
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
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-55" align="end">
                  {/* <DropdownMenuItem
                    className="flex items-center cursor-pointer"
                    onSelect={(e: Event) => {
                      e.preventDefault();
                      handlePrint();
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Nyomtatás</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center cursor-pointer"
                    onSelect={(e: Event) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link a vágólapra másolva");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Link másolása</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <SocialShareButtonsExcel
                      offer={{
                        title: offer.title,
                        description: offer.description,
                        items: offer.items?.map((item) => ({
                          id: item.id,
                          name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          materialUnitPrice: item.materialUnitPrice,
                          materialTotal: item.materialTotal,
                          workTotal: item.workTotal,
                          // Backward compatibility
                          unitPrice: item.unitPrice,
                          totalPrice: item.workTotal,
                        })),
                        totalPrice: offer.totalPrice,
                        createdAt: offer.createdAt,
                        validUntil: offer.validUntil,
                        status: offer.status,
                        notes: offer.notes,
                      }}
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-6 mt-4">
              <div className="flex items-center text-gray-600">
                <Tag className="h-4 w-4 mr-2 text-gray-400" />
                <span>Státusz: </span>
                <span className="ml-1 font-medium">
                  {getStatusDisplay(offer.status || "draft")}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>Létrehozva: </span>
                <span className="ml-1 font-medium">
                  {formatDate(offer.createdAt)}
                </span>
              </div>

              {offer.validUntil && (
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Érvényes: </span>
                  <span className="ml-1 font-medium">
                    {formatDate(offer.validUntil)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Összeg: </span>
                    <span className="font-medium">
                      {formatPrice(calculateTotals().total)} Ft
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {offer.description && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Leírás
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-line">
                  {offer.description}
                </p>
              </div>
            </div>
          )}
        </div>
        <div>
          {/* --- ÚJ LOGIKA: Ha nincs kérdés, plusz gomb és szabad szövegdoboz --- */}
          {(() => {
            const questions = extractQuestions(offer.description || "");
            if (!isDialogOpen && questions.length > 0) {
              return (
                <div className="fixed bottom-0 left-0 w-full bg-transparent border-t border-gray-200 px-4 py-4 z-[9999]">
                  <div className="max-w-7xl mx-auto">
                    <Button
                      onClick={() => {
                        setDemandText(
                          offer.requirement?.description ||
                            offer.description ||
                            ""
                        );
                        setIsDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full py-6 border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-600 focus:ring-orange-500 focus:ring-offset-2 focus:ring-2"
                    >
                      <span className="text-lg font-medium">
                        + Kérdések megválaszolása
                      </span>
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <TextInputDialogQuestions
            open={isDialogOpen}
            setOpen={setIsDialogOpen}
            toolPath="/ai-tools/ai-offer-letter-mobile-redirect"
            questions={extractQuestions(offer.description || "")}
            currentItems={editableItems.map(item => ({
              name: item.name || "",
              quantity: item.quantity || "1",
              unit: item.unit || "db",
              materialUnitPrice: item.materialUnitPrice || "0 Ft",
              workUnitPrice: item.unitPrice || "0 Ft",
              materialTotal: item.materialTotal || "0 Ft",
              workTotal: item.workTotal || "0 Ft"
            }))}
          />
        </div>
        {/* Notes Section */}
        {notes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                Megjegyzések
              </h2>
            </div>
            <div className="p-6">
              <ul className="space-y-4">
                {notes.map((note, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-gray-400">•</div>
                    <p className="ml-2 text-sm text-gray-700">{note}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Requirements Section */}
        {offer.requirement && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowRequirementDetail(true)}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <List className="h-5 w-5 mr-2 text-gray-500" />
                Követelmény
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {offer?.requirement?.updateCount || "1"}
                </span>
              </h2>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Items Section - Mobile View */}
        {items.length > 0 && (
          <div className="mt-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <List className="h-5 w-5 mr-2 text-gray-500" />
                    Tételek
                  </h2>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center px-3 py-1 border border-[#FF9900] text-sm leading-4 font-medium rounded-md text-[#FF9900] hover:bg-[#FF9900]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Új tétel
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <div
                    key={index}
                    id={`item-${item.id || index}`}
                    className="p-4 hover:bg-gray-50"
                  >
                    {/* Item Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          <div
                            onClick={() => startEditing(index)}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          >
                            {index + 1}. {item.name.replace(/^\*\s*/, "")}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(index)}
                          className="text-[#FF9900] hover:text-[#e68a00] transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Biztosan törölni szeretnéd ezt a tételt?"
                              )
                            ) {
                              handleRemoveItem(index);
                            }
                          }}
                          className="text-[#FF9900] hover:text-[#e68a00] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price Grid */}
                    <div className="mt-3 text-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Anyag
                              </th>
                              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Díj
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                                Egységár ({item.unit})
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-right">
                                <div
                                  className="cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                                  onClick={() => startEditing(index)}
                                >
                                  {item.materialUnitPrice
                                    ? formatNumberWithSpace(
                                        item.materialUnitPrice.replace(
                                          /\s*Ft$/,
                                          ""
                                        )
                                      ) + " Ft"
                                    : "0 Ft"}
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-right">
                                <div
                                  className="cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                                  onClick={() => startEditing(index)}
                                >
                                  {item.unitPrice
                                    ? formatNumberWithSpace(
                                        item.unitPrice.replace(/\s*Ft$/, "")
                                      ) + " Ft"
                                    : "0 Ft"}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900">
                                <div className="text-sm text-gray-500 mt-1">
                                  <div
                                    onClick={() => startEditing(index)}
                                    className="cursor-pointer text-gray-900 font-bold hover:bg-gray-100 p-1 rounded"
                                  >
                                    {item.quantity} {item.unit}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                                {item.materialTotal
                                  ? formatNumberWithSpace(
                                      item.materialTotal.replace(/\s*Ft$/, "")
                                    ) + " Ft"
                                  : "0 Ft"}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                                {item.workTotal
                                  ? formatNumberWithSpace(
                                      item.workTotal.replace(/\s*Ft$/, "")
                                    ) + " Ft"
                                  : "0 Ft"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Summary Section */}
                <div className="border-t-2 border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        Munkadíj összesen:
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {workTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        Anyagköltség összesen:
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {materialTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-gray-900">
                        Összesített nettó költség:
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {grandTotal.toLocaleString("hu-HU")} Ft
                      </div>
                    </div>
                    {/* Email Sender Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-4">
                      <button
                        onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 mr-2 text-gray-500" />
                          <span className="font-medium">
                            Ajánlat küldése emailben
                          </span>
                        </div>
                        {isEmailExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {isEmailExpanded && (
                        <div className="px-6 pb-4">
                          <OfferLetterEmailSender
                            items={items.map((item) => ({
                              name: item.name,
                              quantity: item.quantity,
                              unit: item.unit,
                              materialUnitPrice:
                                item.materialUnitPrice || "0 Ft",
                              materialTotal: item.materialTotal || "0 Ft",
                              workUnitPrice: item.unitPrice || "0 Ft",
                              workTotal: item.workTotal || "0 Ft",
                            }))}
                            total={grandTotal.toLocaleString("hu-HU") + " Ft"}
                            title={offer.title || "Ajánlat"}
                            name={extractName(offer.requirement?.title)}
                            email={extractEmail(offer.requirement?.description)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
