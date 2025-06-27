"use client";

import { useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface OfferWithItems extends Omit<Offer, "items" | "notes"> {
  items: Array<{
    name: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalPrice: string;
  }>;
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
  const [showRequirements, setShowRequirements] = useState(false);

  // Debug: log the requirement object
  useEffect(() => {
    console.log("Requirement object:", offer.requirement);
    console.log("Requirement description:", offer.requirement?.description);
  }, [offer.requirement]);

  // Ensure notes is always an array of strings
  const notes = Array.isArray(offer.notes) ? offer.notes : [];

  // Ensure items is always an array
  const items = Array.isArray(offer.items) ? offer.items : [];

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {offer.title || "Ajánlat részletei"}
          </h1>

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
                    {offer.totalPrice?.toLocaleString("hu-HU")} Ft
                  </span>
                </p>
              </div>
            </div>
          </div>
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

      {/* Requirements Section */}
      {offer.requirement && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowRequirements(!showRequirements)}
            className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <List className="h-5 w-5 mr-2 text-gray-500" />
              Követelmény
              <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                1
              </span>
            </h2>
            {showRequirements ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {showRequirements && (
            <div className="p-6 pt-2">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="font-medium text-gray-900">
                  {offer.requirement.title}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {offer.requirement.description ? (
                    <p>{offer.requirement.description}</p>
                  ) : (
                    <p className="text-gray-400 italic">Nincs leírás megadva</p>
                  )}
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {offer.requirement.status || "Aktív"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Section - Pushed to bottom */}
      {items.length > 0 && (
        <div className="mt-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <List className="h-5 w-5 mr-2 text-gray-500" />
                Tételek
              </h2>
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
                        <div className="font-medium">
                          {item.name.replace(/^\*\s*/, "")}
                        </div>
                        {item.unit && (
                          <div className="text-xs text-gray-500 mt-1">
                            Mértékegység: {item.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.unitPrice.replace(/\s*Ft$/, "")} Ft
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {item.totalPrice.replace(/\s*Ft$/, "")} Ft
                      </td>
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
