"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { OfferWithItems } from "@/types/offer.types";
import {
  getRequirementById,
  getOffersByRequirementId,
} from "@/actions/requirement-actions";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import Link from "next/link";
import { Requirement } from "@prisma/client";
import { OfferDetailView } from "@/components/offer-detail-mobile";

// Using shared OfferWithItems type from @/types/offer.types

// Modal component for showing full offer details
function OfferDetailsModal({
  isOpen,
  onClose,
  offer,
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferWithItems;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-900">
              {offer.title || "Ajánlat részletei"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Bezárás"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {offer.description && (
              <div className="prose max-w-none">
                <h4 className="font-medium text-gray-900 mb-2">Leírás:</h4>
                <p className="whitespace-pre-line">{offer.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-medium">Ár:</p>
                <p>{offer.totalPrice?.toLocaleString("hu-HU")} Ft</p>
              </div>
              <div>
                <p className="font-medium">Státusz:</p>
                <p>{getStatusDisplay(offer.status)}</p>
              </div>
              <div>
                <p className="font-medium">Létrehozva:</p>
                <p>
                  {format(new Date(offer.createdAt), "PPP", { locale: hu })}
                </p>
              </div>
              {offer.validUntil && (
                <div>
                  <p className="font-medium">Érvényes:</p>
                  <p>
                    {format(new Date(offer.validUntil), "PPP", { locale: hu })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequirementOffersPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requirementId = Number(params.requirementId);
  const offerId = searchParams.get("offerId");

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [offers, setOffers] = useState<OfferWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferWithItems | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOffer(null);
  };

  // Function to handle viewing offer details
  const handleViewDetails = (offer: OfferWithItems) => {
    // Ensure the offer has the correct type before navigating
    const typedOffer: OfferWithItems = {
      ...offer,
      items: Array.isArray(offer.items) ? offer.items : [],
      notes: Array.isArray(offer.notes) ? offer.notes : [],
    };
    setSelectedOffer(typedOffer);
    setIsDetailView(true);
    router.push(`/offers/${requirementId}?offerId=${offer.id}`, {
      scroll: false,
    });
  };

  // Function to safely handle view details click
  const handleViewDetailsClick = (
    e: React.MouseEvent,
    offer: OfferWithItems
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleViewDetails(offer);
  };

  // Load requirement and offers
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load requirement
        const requirementData = await getRequirementById(requirementId);
        if (!requirementData) {
          throw new Error("A követelmény nem található");
        }
        setRequirement(requirementData);

        // Load offers
        const offersData = await getOffersByRequirementId(requirementId);

        // Transform offer items to match the OfferItem type
        const offersWithRequirement: OfferWithItems[] = offersData.map((offer) => {
          const items = Array.isArray(offer.items) ? offer.items.map(item => {
            // Handle both old and new item formats
            const isNewFormat = 'materialUnitPrice' in item;
            
            return {
              id: item.id,
              name: item.name || '',
              description: item.description || '',
              quantity: item.quantity?.toString() || '0',
              unit: item.unit || 'db',
              materialUnitPrice: isNewFormat ? item.materialUnitPrice : '0',
              unitPrice: isNewFormat ? item.unitPrice : (item.unitPrice || '0'),
              materialTotal: isNewFormat ? item.materialTotal : '0',
              workTotal: isNewFormat ? item.workTotal : (item.totalPrice || '0')
            };
          }) : [];
        
          return {
            ...offer,
            items,
            notes: Array.isArray(offer.notes) ? offer.notes : [],
            requirement: requirementData,
          };
        });

        setOffers(offersWithRequirement);
        
        // Log the transformed offers for debugging
        console.log('Transformed offers:', JSON.stringify(offersWithRequirement, null, 2));

        // If offerId is in URL, load that specific offer
        if (offerId) {
          const selected = offersWithRequirement.find(
            (o) => o.id === Number(offerId)
          );
          if (selected) {
            setSelectedOffer(selected);
            setIsDetailView(true);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Hiba történt az adatok betöltése közben.");
      } finally {
        setIsLoading(false);
      }
    };

    if (requirementId) {
      loadData();
    }
  }, [requirementId, offerId]);

  const handleBackToList = () => {
    // router.push(`/offers/${requirementId}`, { scroll: false });
    router.push(`/offers`, { scroll: false });
    setIsDetailView(false);
    setSelectedOffer(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-white rounded-lg mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
            role="alert"
          >
            <p>{error || "A követelmény nem található"}</p>
            <button
              onClick={() => router.back()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              &larr; Vissza
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-white rounded-lg mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !requirement) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
            role="alert"
          >
            <p>{error || "A követelmény nem található"}</p>
            <button
              onClick={() => router.back()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              &larr; Vissza
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render detail view if an offer is selected
  if (isDetailView && selectedOffer) {
    return (
      <div className="min-h-screen w-full bg-gray-50 pt-4">
        <div className="w-full mx-auto px-4 max-w-6xl">
          <OfferDetailView offer={selectedOffer} onBack={handleBackToList} />
        </div>
      </div>
    );
  }


  // Render list view
  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <div className="w-full mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Vissza"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Ajánlatok</h1>
          </div>
          <p className="text-gray-600 mt-1">{requirement.title}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Ajánlatok ({offers.length})
            </h2>
            <Link
              href={`/offers/new?requirementId=${requirementId}`}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Új ajánlat
            </Link>
          </div>

          {offers.length === 0 ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                Még nincsenek ajánlatok ehhez a követelményhez.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewDetails(offer)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {offer.title || "Névtelen ajánlat"}
                      </h3>
                      {offer.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {offer.description.length > 100
                            ? `${offer.description.substring(0, 100)}...`
                            : offer.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>
                          Ár: {offer.totalPrice?.toLocaleString("hu-HU")} Ft
                        </span>
                        <span className="mx-2">•</span>
                        <span>Státusz: {getStatusDisplay(offer.status)}</span>
                        <span className="mx-2">•</span>
                        <span>
                          Létrehozva:{" "}
                          {format(new Date(offer.createdAt), "PPP", {
                            locale: hu,
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleViewDetailsClick(e, offer)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4"
                    >
                      Részletek →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keep the modal for backward compatibility */}
      {selectedOffer && (
        <OfferDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          offer={{
            ...selectedOffer,
            items: Array.isArray(selectedOffer.items)
              ? selectedOffer.items
              : [],
            notes: Array.isArray(selectedOffer.notes)
              ? selectedOffer.notes
              : [],
          }}
        />
      )}
    </div>
  );
}

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
