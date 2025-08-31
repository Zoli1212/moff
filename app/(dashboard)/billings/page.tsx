"use client";

import { useState, useEffect } from "react";
import { getUserOffers } from "@/actions/offer-actions";
import Link from "next/link";
import { ArrowLeft } from 'lucide-react';


interface OfferItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

interface Offer {
  id: number;
  title: string;
  status: string;
  updatedAt: Date | string;
  requirementId: number;
  items?: OfferItem[];
  tenantEmail?: string;
  createdAt?: Date | string;
  totalPrice?: number;
  createdBy?: string | null;
  description?: string;
}

export default function BillingsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const data = await getUserOffers();
        const transformedData = data
          .map((offer) => ({
            ...offer,
            description: offer.description || undefined,
            createdAt: offer.createdAt ? new Date(offer.createdAt) : new Date(0),
          }))
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
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
      case "work":
        return "Munka";
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
                <Link href="/dashboard" className="p-2">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Számlázás</h1>
                <div className="w-8"></div>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Ajánlatok betöltése...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center">
                  <p className="text-gray-500">Nincsenek ajánlatok, amikből számlát lehetne készíteni.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer: Offer) => (
                    <Link
                      key={offer.id}
                      href={`/billings/${offer.id}`}
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
                                {offer.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${offer.status === 'work' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {getStatusDisplay(offer.status)}
                            </span>
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
    </div>
  );
}