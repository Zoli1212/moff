"use client";

import { useState, useEffect } from "react";
import { getUserOffers } from "@/actions/offer-actions";
import { deleteOffer } from "@/actions/delete-offer";
import { getIncomingQuoteRequests } from "@/actions/quote-request-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, Bell, MapPin, ArrowRight, ChevronDown } from "lucide-react";
import TextInputDialog from "@/app/(routes)/dashboard/_components/TextInputDialog";
import UploadOfferDialog from "@/app/(routes)/dashboard/_components/UploadOfferDialog";
import DeleteConfirmModal from "@/components/ui/delete-confirm-modal";
import { useDemandStore } from "@/store/offerLetterStore";
import { useRequirementIdStore } from "@/store/requirement-id-store";
import { useOfferTitleStore } from "@/store/offer-title-store";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

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
  offerSummary?: string | null;
  requirement?: {
    id: number;
    title: string;
  };
  work?: {
    id: number;
    processingByAI?: boolean;
    updatedByAI?: boolean;
  } | null;
}

interface IncomingRequest {
  notificationId: number;
  sessionId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  clientName: string;
  workTypes: string[];
  location: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const { clearDemandText, clearStoredItems } = useDemandStore();
  const { clearRequirementId } = useRequirementIdStore();
  const { clearOfferTitle } = useOfferTitleStore();
  const { user } = useUser();
  const router = useRouter();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  // Clear the store when the component mounts
  useEffect(() => {
    clearDemandText();
    clearStoredItems();
    clearRequirementId();
    clearOfferTitle();
  }, [clearDemandText, clearStoredItems, clearRequirementId, clearOfferTitle]);

  // Load offers and incoming requests on component mount
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const data = await getUserOffers();
        const transformedData = data
          .map((offer) => ({
            ...offer,
            notes: offer.notes?.map((note) =>
              typeof note === "string" ? { content: note } : note
            ) as Note[],
            description: offer.description || undefined,
            createdAt: offer.createdAt
              ? new Date(offer.createdAt)
              : new Date(0),
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

  // Load incoming quote requests
  useEffect(() => {
    if (!userEmail) return;
    const loadRequests = async () => {
      try {
        const data = await getIncomingQuoteRequests(userEmail);
        setIncomingRequests(data as IncomingRequest[]);
      } catch (error) {
        console.error("Error loading incoming requests:", error);
      }
    };
    loadRequests();
  }, [userEmail]);

  // Auto-refresh when there are offers being processed by AI
  useEffect(() => {
    const hasProcessingOffers = offers.some(
      (offer) => offer.work?.processingByAI === true
    );

    if (!hasProcessingOffers) return;

    // Poll every 3 seconds when there are processing offers
    const intervalId = setInterval(async () => {
      try {
        const data = await getUserOffers();
        const transformedData = data
          .map((offer) => ({
            ...offer,
            notes: offer.notes?.map((note) =>
              typeof note === "string" ? { content: note } : note
            ) as Note[],
            description: offer.description || undefined,
            createdAt: offer.createdAt
              ? new Date(offer.createdAt)
              : new Date(0),
          }))
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        setOffers(transformedData);
      } catch (error) {
        console.error("Error refreshing offers:", error);
      }
    }, 3000); // 3 seconds

    return () => clearInterval(intervalId);
  }, [offers]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return "";
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

  const handleDeleteClick = (offer: Offer, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOfferToDelete(offer);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteOffer(offerToDelete.id);

      if (result.success) {
        toast.success("Ajánlat sikeresen törölve");
        // Remove from local state
        setOffers((prev) => prev.filter((o) => o.id !== offerToDelete.id));
        setDeleteModalOpen(false);
        setOfferToDelete(null);
      } else {
        toast.error(result.error || "Hiba történt a törlés során");
      }
    } catch (error) {
      console.log(error);
      toast.error("Hiba történt a törlés során");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setOfferToDelete(null);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl pb-24">
        <div className="w-full mx-auto px-4 max-w-7xl">
          <div className="mb-6">
            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between relative">
              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
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
                onClick={() => setIsUploadDialogOpen(true)}
                variant="outline"
                className="border-[#FE9C00] text-[#FE9C00] hover:bg-[#FE9C00]/10 text-sm absolute left-1/2 transform -translate-x-1/2"
                aria-label="Meglévő ajánlat feltöltése"
              >
                <Upload className="h-4 w-4 mr-2" />
                Meglévő ajánlat feltöltése
              </Button>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="ml-auto p-2 rounded-full border-[#FE9C00] text-[#FE9C00] hover:bg-[#FE9C00]/10"
                aria-label="Új ajánlat létrehozása"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile header */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Link
                    href="/dashboard"
                    className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
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
                  className="ml-auto p-2 rounded-full border-[#FE9C00] text-[#FE9C00] hover:bg-[#FE9C00]/10"
                  aria-label="Új ajánlat létrehozása"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <Button
                onClick={() => setIsUploadDialogOpen(true)}
                variant="outline"
                className="w-full border-[#FE9C00] text-[#FE9C00] hover:bg-[#FE9C00]/10 text-sm"
                aria-label="Meglévő ajánlat feltöltése"
              >
                <Upload className="h-4 w-4 mr-2" />
                Meglévő ajánlat feltöltése
              </Button>
            </div>

            {/* Incoming quote requests — collapsible */}
            {incomingRequests.length > 0 && (
              <div className="mt-6 mb-6">
                <button
                  onClick={() => setRequestsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Bell className="w-4 h-4 text-orange-500" />
                    Beérkezett ajánlatkérések
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {incomingRequests.length}
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${requestsOpen ? "rotate-180" : ""}`} />
                </button>
                {requestsOpen && <div className="space-y-3 mt-3">
                  {incomingRequests.map((req) => (
                    <button
                      key={req.notificationId}
                      onClick={() => router.push(`/offers/from-request/${req.sessionId}`)}
                      className={`w-full text-left bg-white border rounded-lg p-4 transition-all hover:shadow-md ${
                        !req.isRead
                          ? "border-orange-300 bg-orange-50/50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {!req.isRead && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {req.clientName} — ajánlatkérés
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {req.workTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {req.workTypes.slice(0, 3).map((wt, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200"
                                  >
                                    {wt}
                                  </span>
                                ))}
                                {req.workTypes.length > 3 && (
                                  <span className="text-xs text-gray-400">
                                    +{req.workTypes.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            {req.location && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {req.location}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(req.createdAt).toLocaleDateString("hu-HU", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-orange-400 flex-shrink-0 ml-3" />
                      </div>
                    </button>
                  ))}
                </div>}
              </div>
            )}

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
                  {offers.map((offer: Offer) => {
                    const isProcessing = offer.work?.processingByAI === true;
                    const isDisabled = isProcessing;

                    return (
                      <Link
                        key={offer.id}
                        href={
                          isDisabled || isDialogOpen
                            ? "#"
                            : `/offers/${offer.requirementId}?offerId=${offer.id}`
                        }
                        onClick={(e) => {
                          if (isDisabled || isDialogOpen) {
                            e.preventDefault();
                          }
                        }}
                        className={`block bg-white border border-gray-200 rounded-lg transition-shadow ${isDisabled || isDialogOpen ? "opacity-60 cursor-not-allowed" : ""}`}
                        style={{
                          boxShadow:
                            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDisabled && !isDialogOpen) {
                            e.currentTarget.style.boxShadow =
                              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDisabled && !isDialogOpen) {
                            e.currentTarget.style.boxShadow =
                              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
                          }
                        }}
                      >
                        <div className="p-4 relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-[#FE9C00] group-hover:text-[#FE9C00]/80 transition-colors">
                                {offer.title || "Névtelen ajánlat"}
                              </h3>
                              {offer.offerSummary && (
                                <p className="mt-1 text-sm text-gray-700">
                                  {offer.offerSummary.length > 100
                                    ? `${offer.offerSummary.substring(0, 150)}...`
                                    : offer.offerSummary}
                                </p>
                              )}
                              {offer.description && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {offer.description.includes(
                                    "Becsült kivitelezési idő"
                                  )
                                    ? (() => {
                                        const text =
                                          offer.description.substring(
                                            offer.description.indexOf(
                                              "Becsült kivitelezési idő"
                                            )
                                          );
                                        const parts = text.split(
                                          "Becsült kivitelezési idő:"
                                        );
                                        const afterColon = parts[1] || "";
                                        // Extract only the time duration (e.g., "10-14 nap")
                                        const timeMatch =
                                          afterColon.match(
                                            /^\s*(\d+-?\d*\s*nap)/
                                          );
                                        const timePart = timeMatch
                                          ? timeMatch[1]
                                          : "";
                                        return (
                                          <>
                                            <span className="font-bold">
                                              Becsült kivitelezési idő:
                                            </span>
                                            <span className="font-bold">
                                              {" "}
                                              {timePart}
                                            </span>
                                          </>
                                        );
                                      })()
                                    : offer.description.length > 100
                                      ? `${offer.description.substring(0, 250)}...`
                                      : offer.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isProcessing && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-xs font-medium">
                                    Feldolgozás...
                                  </span>
                                </div>
                              )}
                              {offer.status === "draft" && !isProcessing && (
                                <button
                                  onClick={(e) => handleDeleteClick(offer, e)}
                                  className="p-1 transition-colors"
                                  style={{ color: "#FE9C00" }}
                                  title="Ajánlat törlése"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              {!isProcessing &&
                                getStatusDisplay(offer.status) && (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${offer.status === "work" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                                  >
                                    {getStatusDisplay(offer.status)}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="mt-2 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              {offer.totalPrice ? (
                                <>
                                  <span className="font-medium text-black">
                                    Összesen:{" "}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {new Intl.NumberFormat("hu-HU", {
                                      style: "currency",
                                      currency: "HUF",
                                      maximumFractionDigits: 0,
                                    }).format(offer.totalPrice)}
                                  </span>
                                </>
                              ) : (
                                <span>Ár nincs megadva</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {!isDialogOpen && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-4 z-[9999]">
          <div className="max-w-7xl mx-auto">
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              className="w-full py-6 border-[#FE9C00] text-[#FE9C00] hover:bg-[#FE9C00]/10 hover:text-[#FE9C00]/80 hover:border-[#FE9C00]/80 focus:ring-[#FE9C00] focus:ring-offset-2 focus:ring-2"
            >
              <span className="text-lg font-medium">+ Új felmérés</span>
            </Button>
          </div>
        </div>
      )}

      <TextInputDialog
        open={isDialogOpen}
        setOpen={setIsDialogOpen}
      />

      <UploadOfferDialog
        open={isUploadDialogOpen}
        setOpen={setIsUploadDialogOpen}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Ajánlat törlése"
        message={`Biztosan törölni szeretnéd a(z) "${offerToDelete?.title || "Névtelen ajánlat"}" ajánlatot? Ez a művelet nem vonható vissza.`}
        confirmText="Törlés"
        cancelText="Mégse"
        isLoading={isDeleting}
      />
    </div>
  );
}
