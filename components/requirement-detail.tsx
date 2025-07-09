"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDemandStore } from "@/store/offerLetterStore";
import { getOfferById } from "@/actions/offer-actions";
import { Loader2, X, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import revalidatePath from "@/lib/revalidate-path";
import { parseRequirementLines, isLineDeletable, RequirementLine } from "@/lib/requirement-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Requirement {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

interface RequirementDetailProps {
  requirement: Requirement;
  onBack: () => void;
  onRequirementUpdated?: (updatedRequirement: {
    id: number;
    description: string;
  }) => void;
}

export function RequirementDetail({
  requirement,
  onBack,
  onRequirementUpdated,
}: RequirementDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    storedItems,
    setStoredItems,
    setDemandText,
    isGlobalLoading,
    setGlobalLoading,
  } = useDemandStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
  const [lines, setLines] = useState<RequirementLine[]>([]);
  const [currentDescription, setCurrentDescription] = useState(
    requirement?.description || ""
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);

  // Fetch offer and its items when component mounts
  useEffect(() => {
    const fetchOffer = async () => {
      const offerId = searchParams.get("offerId");
      if (offerId) {
        try {
          const offer = await getOfferById(parseInt(offerId));
          if (offer && offer.items) {
            // Transform items to match the TableItem format expected by the store
            const tableItems = offer.items.map(
              (item: {
                name: string;
                quantity: number;
                unit: string;
                unitPrice: number;
                materialUnitPrice: number;
              }) => ({
                name: item.name,
                quantity: item.quantity.toString(),
                unit: item.unit,
                materialUnitPrice: item.materialUnitPrice || "0",
                workUnitPrice: item.unitPrice.toString(), // Default value since it's not in the item
                materialTotal: (
                  item.materialUnitPrice * item.quantity
                ).toString(),
                workTotal: (item.unitPrice * item.quantity).toString(), // Default value since it's not in the item
              })
            );

            setStoredItems(tableItems);
          }
        } catch (error) {
          console.error("Error fetching offer items:", error);
        }
      }
    };

    fetchOffer();
  }, [searchParams, setStoredItems]);

  const handleSubmit = async () => {
    if (!newText.trim()) {
      setError("Kérjük adj meg szöveget a kiegészítéshez!");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Combine the existing description with the new text
      const updatedDescription = `${currentDescription ? currentDescription + "\n\n" : ""}${newText}`;

      // Update the requirement in the database
      const response = await fetch("/api/update-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: requirement.id,
          data: {
            description: updatedDescription,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Hiba történt a követelmény frissítése során"
        );
      }

      // Update the local state
      setCurrentDescription(updatedDescription);
      setNewText("");

      // Save the updated description as demandText in the store
      setDemandText(updatedDescription);

      // Notify parent component about the update
      if (onRequirementUpdated) {
        onRequirementUpdated({
          ...requirement,
          description: updatedDescription,
        });
      }

      toast.success("Követelmény sikeresen frissítve!");
    } catch (error) {
      console.error("Error updating requirement:", error);
      setError(
        "Hiba történt a követelmény frissítése közben. Kérjük próbáld újra később."
      );
      toast.error("Hiba történt a követelmény frissítése közben");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!newText.trim()) {
      const errorMsg = "Kérjük adj meg egy szöveget az elemzéshez!";
      console.log("Validation error:", errorMsg);
      setError(errorMsg);
      return;
    }

    // Set global loading state
    setGlobalLoading(true);
    setError("");

    // Store loading state in session storage to persist across navigation
    if (typeof window !== "undefined") {
      sessionStorage.setItem("isGlobalLoading", "true");
    }

    // Clean up function to ensure loading state is reset
    const cleanup = () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("isGlobalLoading");
      }
      setGlobalLoading(false);
    };

    // Set up cleanup on page unload
    const cleanupOnUnload = () => {
      if (typeof window === "undefined") return () => {};

      const handleBeforeUnload = () => {
        // Keep the loading state in session storage
        sessionStorage.setItem("isGlobalLoading", "true");
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    };

    // Set up cleanup
    const removeUnloadListener = cleanupOnUnload();

    // Also clean up when component unmounts
    const cleanupOnUnmount = () => {
      return () => {
        removeUnloadListener();
        // Don't clean up if we're navigating away
        const currentUrl =
          typeof window !== "undefined" ? window.location.href : "";
        const isNavigatingAway = !currentUrl.includes("requirement");

        if (!isNavigatingAway) {
          cleanup();
        }
      };
    };

    const finalCleanup = cleanupOnUnmount();

    try {
      // First save the updated description if there are changes
      if (newText.trim() && newText !== currentDescription) {
        await handleSubmit();
      }

      // Create a new record ID
      const recordId = crypto.randomUUID();

      // Prepare the combined text with original requirement and new text
      const combinedText = `Eredeti követelmény: ${currentDescription}\n\nKiegészítő információk:\n${newText}`;

      // Create form data for the API
      const formData = new FormData();
      formData.append("recordId", recordId);
      formData.append("textContent", combinedText);
      formData.append("type", "offer-letter");
      formData.append("requirementId", requirement.id.toString());

      // Küldjük el a meglévő tételeket is, ha vannak
      if (storedItems && storedItems.length > 0) {
        formData.append("existingItems", JSON.stringify(storedItems));
      }

      // Call the API
      const response = await fetch("/api/ai-demand-agent", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Hiba történt az újraküldés során");
      }

      const result = await response.json();
      console.log("Event queued:", result.eventId);
      toast.success("Követelmény sikeresen újraküldve! Folyamatban...");

      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        try {
          const statusRes = await fetch(
            `/api/ai-demand-agent/status?eventId=${result.eventId}`
          );
          const { status } = await statusRes.json();
          console.log("Status:", status);

          if (status === "Completed") {
            setGlobalLoading(false);
            revalidatePath("/offer");
            toast.success("Sikeresen feldolgozva!");
            // Redirect to the new offer page
            router.push(
              `/ai-tools/ai-offer-letter-mobile-redirect/${recordId}`
            );
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setGlobalLoading(false);
            setError("A feldolgozás nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setGlobalLoading(false);
          setError("Hiba történt az állapot lekérdezése során.");
        }
      };

      poll();
    } catch (error) {
      console.error("Error in handleResubmit:", error);
      setError("Hiba történt a feldolgozás során. Kérjük próbálja újra.");
      toast.error("Hiba történt a feldolgozás során");
      finalCleanup();
    }
  };

  // Parse the description into lines when it changes
  useEffect(() => {
    const description = requirement?.description || '';
    const parsedLines = parseRequirementLines(description)
      .filter(line => line.text.trim() !== ''); // Filter out empty lines
    setLines(parsedLines);
  }, [requirement?.description]);

  // Handle delete confirmation
  const confirmDelete = (lineId: string) => {
    setLineToDelete(lineId);
    setIsDeleteDialogOpen(true);
  };

  // Handle removing a line
  const handleRemoveLine = async () => {
    if (!lineToDelete) return;
    
    try {
      setIsProcessing(true);
      
      // Find the line to remove
      const lineToRemove = lines.find(line => line.id === lineToDelete);
      if (!lineToRemove) {
        setLineToDelete(null);
        setIsDeleteDialogOpen(false);
        return;
      }
      
      // Create the updated description by excluding the line to be removed
      const currentDescription = requirement.description || '';
      const allLines = currentDescription.split('\n');
      const updatedLines = allLines.filter(line => line.trim() !== lineToRemove.text.trim());
      const updatedDescription = updatedLines.join('\n').trim();
      
      // Update the requirement in the database
      const response = await fetch("/api/update-requirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requirementId: requirement.id,
          data: {
            description: updatedDescription,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update requirement');
      }

      // Update the local state
      const data = await response.json();
      if (data.success) {
        setCurrentDescription(updatedDescription);
        setLines(prevLines => prevLines.filter(line => line.id !== lineToDelete));
        setLineToDelete(null);
        setIsDeleteDialogOpen(false);
        toast.success('A sor sikeresen eltávolítva');
      } else {
        throw new Error(data.error || 'Ismeretlen hiba történt');
      }
    } catch (error) {
      console.error('Error removing line:', error);
      toast.error('Hiba történt a sor eltávolítása közben');
    } finally {
      setIsProcessing(false);
      setLineToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full w-10 h-10 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {requirement.title}
        </h1>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
        {/* Description Section */}
        <div className="p-4">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            {lines.length > 0 ? (
              <div>
                {lines.map((line) => (
                  <div 
                    key={line.id}
                    className="group flex items-center gap-2 px-3 py-0.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`whitespace-pre-wrap break-words text-gray-800 text-sm leading-tight ${
                        line.isSectionHeader ? 'font-semibold' : ''
                      }`}>
                        {line.text}
                      </p>
                    </div>
                    {isLineDeletable(line) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(line.id);
                        }}
                        disabled={isProcessing}
                        className="flex-shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors p-0.5 -mr-1"
                        title="Sor eltávolítása"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center">
                <p className="text-gray-400 text-sm italic">Nincs megjeleníthető tartalom</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-2">Kiegészítő információk</h3>
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="min-h-[80px] bg-white text-sm"
            placeholder="Írd ide a további követelményeket vagy módosításokat..."
          />
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewText("");
                setError("");
              }}
              disabled={isSubmitting || isGlobalLoading}
              className="min-w-[120px]"
            >
              <X className="h-4 w-4 mr-2" />
              Mégse
            </Button>
            
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {requirement.status || "Aktív"}
              </span>
              
              <Button
                onClick={handleResubmit}
                disabled={isSubmitting || isGlobalLoading || !newText.trim()}
                className="bg-[#FF9900] hover:bg-[#e68a00] text-white min-w-[160px] relative"
              >
                <span className={`flex items-center ${isGlobalLoading ? "invisible" : "visible"}`}>
                  <Send className="h-4 w-4 mr-2" />
                  Ajánlat frissítése
                </span>
                {isGlobalLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Megerősítés szükséges</DialogTitle>
            <DialogDescription>
              Biztosan eltávolítod ezt a sort? A művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Mégse
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveLine}
              disabled={isProcessing}
            >
              {isProcessing ? 'Feldolgozás...' : 'Eltávolítás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
