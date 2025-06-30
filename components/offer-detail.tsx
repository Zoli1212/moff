"use client";

import { useEffect, useState, useCallback } from "react";
import { updateOfferItems } from "@/actions/offer-actions";
import { toast } from "sonner";
import SocialShareButtons from './SocialShareButtons';
import { RequirementDetail } from './requirement-detail';
import { Offer } from "@prisma/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
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
  X,
  Save,
  Plus
} from "lucide-react";

interface OfferItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
}

interface OfferWithItems extends Omit<Offer, "items" | "notes"> {
  items: OfferItem[];
  notes: string[];
  requirement: {
    id: number;
    title: string;
    description: string | null;
    status: string;
  } | null;
}

interface OfferDetailViewProps {
  offer: OfferWithItems;
  onBack: () => void;
}

export function OfferDetailView({ offer, onBack }: OfferDetailViewProps) {
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<OfferItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OfferItem[]>([]);
  
  // Initialize items
  useEffect(() => {
    if (offer.items) {
      const items = Array.isArray(offer.items) ? offer.items : [];
      // Ensure all items have the required fields
      const validatedItems = items.map(item => ({
        name: item.name || '',
        quantity: item.quantity || '0',
        unit: item.unit || 'db',
        unitPrice: item.unitPrice || '0',
        totalPrice: item.totalPrice || '0',
      }));
      setEditableItems([...validatedItems]);
      setOriginalItems([...validatedItems]);
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
    
    // Recalculate total if quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseCurrency(item.unitPrice);
      const total = quantity * unitPrice;
      item.totalPrice = formatCurrency(total);
    }
    
    newItems[index] = item;
    setEditableItems(newItems);
  };

  // Add new item
  const handleAddItem = () => {
    setEditableItems([...editableItems, {
      name: "",
      quantity: "1",
      unit: "db",
      unitPrice: "0",
      totalPrice: "0"
    }]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newItems = [...editableItems];
    newItems.splice(index, 1);
    setEditableItems(newItems);
  };

  // Toggle edit mode
  const toggleEditMode = async () => {
    if (isEditing) {
      // Save changes when exiting edit mode
      try {
        const result = await updateOfferItems(parseInt(offer.id.toString()), editableItems);
        if (result.success) {
          toast.success("Az ajánlat sikeresen frissítve");
          // Update the offer with the server response
          if (result.offer) {
            setEditableItems(result.offer.items);
            setOriginalItems([...result.offer.items]);
          }
        } else {
          toast.error(result.error || "Hiba történt a mentés során");
          // Revert to original items on error
          setEditableItems([...originalItems]);
        }
      } catch (error) {
        console.error('Error saving offer:', error);
        toast.error("Hiba történt a mentés során");
        // Revert to original items on error
        setEditableItems([...originalItems]);
      }
    } else {
      // When entering edit mode, make a copy of the current items
      setOriginalItems([...editableItems]);
    }
    setIsEditing(!isEditing);
  };

  // Calculate total price
  const calculateTotal = useCallback(() => {
    return editableItems.reduce((sum, item) => {
      return sum + parseCurrency(item.totalPrice);
    }, 0);
  }, [editableItems]);

  // Debug: log the requirement object
  useEffect(() => {
    console.log("Requirement object:", offer.requirement);
    console.log("Requirement description:", offer.requirement?.description);
  }, [offer.requirement]);

  // Ensure notes is always an array of strings
  const notes = Array.isArray(offer.notes) ? offer.notes : [];
  
  // Use editableItems when in edit mode, otherwise use original items
  const items = isEditing ? editableItems : (Array.isArray(offer.items) ? offer.items : []);

  // Format price with Hungarian locale

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

  return (
    <div className="flex flex-col h-full">
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
            <div className="ml-4">
              <SocialShareButtons offer={{
                title: offer.title,
                description: offer.description,
                items: offer.items,
                totalPrice: offer.totalPrice,
                validUntil: offer.validUntil,
                status: offer.status
              }} />
            </div>
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
                    {isEditing 
                      ? formatCurrency(calculateTotal())
                      : offer.totalPrice?.toLocaleString("hu-HU")} Ft
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
                {!isEditing && (
                  <button
                    onClick={toggleEditMode}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Szerkesztés
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={toggleEditMode}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <X className="h-4 w-4 mr-1" /> Mégse
                  </button>
                  <button
                    onClick={toggleEditMode}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Save className="h-4 w-4 mr-1" /> Mentés
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Új tétel
                  </button>
                </div>
              )}
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
                      Megnevezés
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      Mennyiség
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Egységár
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Összesen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}.
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full p-1 border rounded"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          />
                        ) : (
                          <div className="font-medium">
                            {item.name.replace(/^\*\s*/, "")}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="mt-1">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-xs"
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              placeholder="Mértékegység"
                            />
                          </div>
                        ) : item.unit ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Mértékegység: {item.unit}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-20 p-1 border rounded text-right"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={item.unitPrice.replace(/\s*Ft$/, "")}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          `${item.unitPrice.replace(/\s*Ft$/, "")} Ft`
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              className="w-24 p-1 border rounded text-right"
                              value={item.totalPrice.replace(/\s*Ft$/, "")}
                              readOnly
                            />
                            <span className="ml-1">Ft</span>
                          </div>
                        ) : (
                          `${item.totalPrice.replace(/\s*Ft$/, "")} Ft`
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-right">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Törlés
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Összesítő sor */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                    >
                      Összesen:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {items
                        .reduce((sum, item) => {
                          const price =
                            parseFloat(
                              item.totalPrice.replace(/[^0-9]/g, "")
                            ) || 0;
                          return sum + price;
                        }, 0)
                        .toLocaleString("hu-HU")}{" "}
                      Ft
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
