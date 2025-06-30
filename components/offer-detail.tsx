"use client";

import { useEffect, useState, useCallback } from "react";
import { updateOfferItems } from "@/actions/offer-actions";
import { toast } from "sonner";
import SocialShareButtons from "./SocialShareButtons";
import { RequirementDetail } from "./requirement-detail";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { OfferItem, OfferWithItems } from "@/types/offer.types";
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
  Share2,
  MoreVertical,
  Download,
  Mail,
  Copy,
  Printer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface OfferDetailViewProps {
  offer: OfferWithItems;
  onBack: () => void;
}

export function OfferDetailView({ offer, onBack }: OfferDetailViewProps) {
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItems, setOriginalItems] = useState<OfferItem[]>([]);

  // Log items when they change
  useEffect(() => {
    console.log("Current items:", JSON.stringify(editableItems, null, 2));
  }, [editableItems]);

  // Initialize items
  useEffect(() => {
    if (offer.items) {
      const items = Array.isArray(offer.items) ? offer.items : [];
      // Ensure all items have the required fields
      const validatedItems = items.map((item, index) => ({
        id: index, // Add unique id for each item
        name: item.name || "",
        quantity: item.quantity || "1",
        unit: item.unit || "db",
        materialUnitPrice: item.materialUnitPrice || "0 Ft",
        workUnitPrice: item.workUnitPrice || "0 Ft",
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

  // Handle item field change
  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...editableItems];
    const item = { ...newItems[index], [field]: value };

    // Recalculate totals if quantity or prices change
    if (["quantity", "materialUnitPrice", "workUnitPrice"].includes(field)) {
      const quantity = parseFloat(item.quantity) || 0;
      const materialUnitPrice = parseCurrency(item.materialUnitPrice);
      const workUnitPrice = parseCurrency(item.workUnitPrice);

      item.materialTotal = formatCurrency(quantity * materialUnitPrice);
      item.workTotal = formatCurrency(quantity * workUnitPrice);
    }

    newItems[index] = item;
    setEditableItems(newItems);
  };

  // Add new item
  const handleAddItem = () => {
    const newItem = {
      id: Date.now(), // Use timestamp as temporary ID
      name: "",
      quantity: "1",
      unit: "db",
      materialUnitPrice: "0 Ft",
      workUnitPrice: "0 Ft",
      materialTotal: "0 Ft",
      workTotal: "0 Ft",
    };

    const updatedItems = [...editableItems, newItem];
    setEditableItems(updatedItems);
    setEditingItemId(updatedItems.length - 1); // Set editing mode for the new item

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

  // Start editing an item
  const startEditing = (index: number) => {
    setEditingItemId(index);
  };

  // Save the current item being edited
  const saveItem = async (index: number) => {
    if (isSaving) return;

    const item = editableItems[index];
    if (!item.name || !item.quantity || !item.unit) {
      toast.error("Kérem töltse ki az összes kötelező mezőt");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateOfferItems(
        parseInt(offer.id.toString()),
        editableItems
      );

      if (result.success) {
        toast.success("A tétel sikeresen mentve");
        setEditingItemId(null);
        // Update original items with the saved data
        if (result.offer?.items) {
          setOriginalItems([...result.offer.items]);
        }
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

  // Cancel editing the current item
  const cancelEditing = (index: number) => {
    if (originalItems[index]) {
      const newItems = [...editableItems];
      newItems[index] = { ...originalItems[index] };
      setEditableItems(newItems);
    }
    setEditingItemId(null);
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
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;
    
    // Get the HTML for the print view
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${offer.title || 'Ajánlat'}</title>
        <meta charset="utf-8">
        <style>${printStyles}</style>
      </head>
      <body>
        <div id="printable-area">
          <div class="print-header">
            <div class="print-title">${offer.title || 'Ajánlat'}</div>
            <div class="print-meta">
              <div><strong>Státusz:</strong> ${getStatusDisplay(offer.status || 'draft')}</div>
              <div><strong>Létrehozva:</strong> ${formatDate(offer.createdAt)}</div>
              ${offer.validUntil ? `<div><strong>Érvényes:</strong> ${formatDate(offer.validUntil)}</div>` : ''}
            </div>
          </div>
          
          ${offer.description ? `
            <div class="print-section">
              <div class="print-section-title">Leírás</div>
              <div>${offer.description.replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}
          
          ${items.length > 0 ? `
            <div class="print-section">
              <div class="print-section-title">Tételek</div>
              <table class="print-table">
                <thead>
                  <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 25%;">Tétel megnevezése</th>
                    <th style="width: 8%;">Mennyiség</th>
                    <th style="width: 8%;">Egység</th>
                    <th style="width: 15%;">Anyag egységár</th>
                    <th style="width: 15%;">Díj egységár</th>
                    <th style="width: 12%;">Anyag összesen</th>
                    <th style="width: 12%;">Díj összesen</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => `
                    <tr>
                      <td class="text-center">${index + 1}.</td>
                      <td>${item.name.replace(/^\*\s*/, '')}</td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-center">${item.unit}</td>
                      <td class="text-right">${item.materialUnitPrice || '0 Ft'}</td>
                      <td class="text-right">${item.workUnitPrice || '0 Ft'}</td>
                      <td class="text-right">${item.materialTotal || '0 Ft'}</td>
                      <td class="text-right">${item.workTotal || '0 Ft'}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td colspan="4" class="text-right font-bold">Munkadíj összesen:</td>
                    <td colspan="4" class="text-right font-bold">${workTotal.toLocaleString('hu-HU')} Ft</td>
                  </tr>
                  <tr>
                    <td colspan="4" class="text-right font-bold">Anyagköltség összesen:</td>
                    <td colspan="4" class="text-right font-bold">${materialTotal.toLocaleString('hu-HU')} Ft</td>
                  </tr>
                  <tr>
                    <td colspan="4" class="text-right font-bold">Összesített nettó költség:</td>
                    <td colspan="4" class="text-right font-bold">${grandTotal.toLocaleString('hu-HU')} Ft</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${notes.length > 0 ? `
            <div class="print-section">
              <div class="print-section-title">Megjegyzések</div>
              <ul>
                ${notes.map(note => `<li>• ${note}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="flex flex-col h-full" id="printable-area">
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
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">        
                <DropdownMenuItem
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
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <div className="text-xs font-medium text-gray-500 px-2 mb-1">
                    Megosztás
                  </div>
                  <SocialShareButtons
                    offer={{
                      title: offer.title,
                      description: offer.description,
                      items: offer.items?.map((item) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit,
                        materialUnitPrice: item.materialUnitPrice,
                        workUnitPrice: item.workUnitPrice,
                        materialTotal: item.materialTotal,
                        workTotal: item.workTotal,
                        // Backward compatibility
                        unitPrice: item.workUnitPrice,
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
                  <span className="font-bold text-lg">
                    {editingItemId !== null
                      ? formatPrice(calculateTotals().total)
                      : offer.totalPrice?.toLocaleString("hu-HU")}{" "}
                    Ft
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
                1
              </span>
            </h2>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Items Section - Pushed to bottom */}
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
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-1" /> Új tétel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tétel megnevezése
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
                    >
                      Mennyiség
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
                    >
                      Egység
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Anyag egységár
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Díj egységár
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Anyag összesen
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Díj összesen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      id={`item-${item.id || index}`}
                      className={`hover:bg-gray-50 ${editingItemId === index ? "bg-blue-50" : ""}`}
                    >
                      {/* # */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}.
                      </td>

                      {/* Tétel megnevezése */}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {editingItemId === index ? (
                          <input
                            type="text"
                            className="w-full p-1 border rounded"
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(index, "name", e.target.value)
                            }
                          />
                        ) : (
                          <div
                            className="font-medium cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => startEditing(index)}
                          >
                            {item.name.replace(/^\*\s*/, "")}
                          </div>
                        )}
                      </td>

                      {/* Mennyiség */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-left">
                        {editingItemId === index ? (
                          <input
                            type="text"
                            className="w-20 p-1 border rounded"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => startEditing(index)}
                          >
                            {item.quantity}
                          </div>
                        )}
                      </td>

                      {/* Egység */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-left">
                        {editingItemId === index ? (
                          <input
                            type="text"
                            className="w-20 p-1 border rounded"
                            value={item.unit}
                            onChange={(e) =>
                              handleItemChange(index, "unit", e.target.value)
                            }
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => startEditing(index)}
                          >
                            {item.unit}
                          </div>
                        )}
                      </td>

                      {/* Anyag egységár */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {editingItemId === index ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={
                                item.materialUnitPrice?.replace(/\s*Ft$/, "") ||
                                "0"
                              }
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "materialUnitPrice",
                                  e.target.value
                                )
                              }
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          <div
                            className="whitespace-nowrap cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                            onClick={() => startEditing(index)}
                          >
                            {item.materialUnitPrice || "0 Ft"}
                          </div>
                        )}
                      </td>

                      {/* Díj egységár */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {editingItemId === index ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={
                                item.workUnitPrice?.replace(/\s*Ft$/, "") || "0"
                              }
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "workUnitPrice",
                                  e.target.value
                                )
                              }
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          <div
                            className="whitespace-nowrap cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                            onClick={() => startEditing(index)}
                          >
                            {item.workUnitPrice || "0 Ft"}
                          </div>
                        )}
                      </td>

                      {/* Anyag összesen */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {editingItemId === index ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={item.materialTotal.replace(/\s*Ft$/, "")}
                              readOnly
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          <div
                            className="whitespace-nowrap cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                            onClick={() => startEditing(index)}
                          >
                            {formatPrice(parseCurrency(item.materialTotal))}
                          </div>
                        )}
                      </td>

                      {/* Díj összesen */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {editingItemId === index ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={item.workTotal.replace(/\s*Ft$/, "")}
                              readOnly
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          <div
                            className="whitespace-nowrap cursor-pointer hover:bg-gray-100 p-1 rounded text-right"
                            onClick={() => startEditing(index)}
                          >
                            {formatPrice(parseCurrency(item.workTotal))}
                          </div>
                        )}
                      </td>

                      {/* Műveletek */}
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-right">
                        {editingItemId === index ? (
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={() => cancelEditing(index)}
                              className="px-2 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              disabled={isSaving}
                            >
                              Mégse
                            </button>
                            <button
                              onClick={() => saveItem(index)}
                              className="px-2 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                              disabled={isSaving}
                            >
                              {isSaving ? "Mentés..." : "Mentés"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={() => startEditing(index)}
                              className="p-1 text-blue-600 rounded-full hover:bg-blue-50"
                              title="Szerkesztés"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    "Biztosan törölni szeretné ezt a tételt?"
                                  )
                                ) {
                                  handleRemoveItem(index);
                                }
                              }}
                              className="p-1 text-red-600 rounded-full hover:bg-red-50"
                              title="Törlés"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Összesítő sorok */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td
                      colSpan={8}
                      className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                    >
                      Munkadíj összesen:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {workTotal.toLocaleString("hu-HU")} Ft
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={8}
                      className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                    >
                      Anyagköltség összesen:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {materialTotal.toLocaleString("hu-HU")} Ft
                    </td>
                  </tr>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td
                      colSpan={8}
                      className="px-4 py-3 text-right text-sm font-bold text-gray-900"
                    >
                      Összesített nettó költség:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {grandTotal.toLocaleString("hu-HU")} Ft
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
