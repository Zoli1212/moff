"use client";

import { useState, useEffect } from "react";
import { getUserOffers } from "@/actions/offer-actions";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TextInputDialog from "@/app/(routes)/dashboard/_components/TextInputDialog";

interface OfferItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

interface Note {
  id?: number;
  content: string;
  createdAt?: string | Date;
  createdBy?: string | null;
}

type NoteInput = Note | string; // Allow string for backward compatibility

interface Offer {
  id: number;
  title: string;
  status: string;
  updatedAt: Date | string;
  requirementId: number;
  items?: OfferItem[];
  notes?: NoteInput[];
  tenantEmail?: string;
  createdAt?: Date | string;
  totalPrice?: number;
  createdBy?: string | null;
  description?: string;
  requirement?: {
    id: number;
    title: string;
  };
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load offers on component mount
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const data = await getUserOffers();
        // Transform and sort data
        const transformedData = data
          .map((offer) => ({
            ...offer,
            notes: offer.notes?.map((note) =>
              typeof note === "string" ? { content: note } : note
            ) as Note[],
            description: offer.description || undefined, // Convert null to undefined
            // Ensure createdAt is a Date object for consistent sorting
            createdAt: offer.createdAt ? new Date(offer.createdAt) : new Date(0),
          }))
          // Sort by createdAt in descending order (newest first)
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Descending order
          });
        setOffers(transformedData);
      } catch (error) {
        console.error("Error loading offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOffers();
  }, []);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return "Piszkozat";
      case "sent":
        return "Elküldve";
      case "accepted":
        return "Elfogadva";
      case "rejected":
        return "Elutasítva";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="w-full mx-auto px-4 max-w-7xl">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Vissza a főoldalra"
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
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Ajánlatok</h1>
              </div>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="ml-auto p-2 rounded-full border-[#FF9900] text-[#FF9900] hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
                aria-label="Új ajánlat létrehozása"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Betöltés...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center">
                  <p className="text-gray-500">Még nincsenek ajánlataid.</p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="mt-4"
                  >
                    Új ajánlat létrehozása
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer: Offer) => (
                    <Link
                      key={offer.id}
                      href={`/offers/${offer.requirementId}?offerId=${offer.id}`}
                      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {offer.title || "Névtelen ajánlat"}
                            </h3>
                            {offer.description && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                {offer.description.length > 100
                                  ? `${offer.description.substring(0, 100)}...`
                                  : offer.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getStatusDisplay(offer.status)}
                            </span>
                            <p className="mt-1 text-sm text-gray-500">
                              {offer.updatedAt
                                ? format(new Date(offer.updatedAt), "PPP", {
                                    locale: hu,
                                  })
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {offer.totalPrice ? (
                              <span className="font-medium text-gray-900">
                                {new Intl.NumberFormat("hu-HU", {
                                  style: "currency",
                                  currency: "HUF",
                                  maximumFractionDigits: 0,
                                }).format(offer.totalPrice)}
                              </span>
                            ) : (
                              <span>Ár nincs megadva</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {offer.createdAt
                              ? format(new Date(offer.createdAt), "PPP", {
                                  locale: hu,
                                })
                              : "Nincs dátum"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {!isDialogOpen && <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-4 z-[9999]">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            className="w-full py-6 border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-600 focus:ring-orange-500 focus:ring-offset-2 focus:ring-2"
          >
            <span className="text-lg font-medium">+ Új felmérés</span>
          </Button>
        </div>
      </div>}

      <TextInputDialog
        open={isDialogOpen}
        setOpen={setIsDialogOpen}
        toolPath="/ai-tools/ai-offer-letter-mobile-redirect"
      />
    </div>
  );
}
