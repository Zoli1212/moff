"use client";

import { useState } from "react";
import { ArrowLeft, Edit, X, Save, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Requirement {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

interface RequirementDetailProps {
  requirement: Requirement;
  onBack: () => void;
  onRequirementUpdated?: (updatedRequirement: { id: number; description: string }) => void;
}

export function RequirementDetail({
  requirement,
  onBack,
  onRequirementUpdated,
}: RequirementDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
  const [currentDescription, setCurrentDescription] = useState(
    requirement.description || ""
  );
  const [isResubmitting, setIsResubmitting] = useState(false);

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

      // Notify parent component about the update
      if (onRequirementUpdated) {
        onRequirementUpdated({
          ...requirement,
          description: updatedDescription,
        });
      }

      toast.success("Követelmény sikeresen frissítve!");
      setIsEditing(false);
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

    setIsResubmitting(true);
    setError("");

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
          const statusRes = await fetch(`/api/ai-demand-agent/status?eventId=${result.eventId}`);
          const { status } = await statusRes.json();
          console.log("Status:", status);

          if (status === "Completed") {
            setIsResubmitting(false);
            toast.success("Sikeresen feldolgozva!");
            // Redirect to the new offer page
            router.push(`/ai-tools/ai-offer-letter/${recordId}`);
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setIsResubmitting(false);
            setError("A feldolgozás nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setIsResubmitting(false);
          setError("Hiba történt az állapot lekérdezése során.");
        }
      };

      poll();
      
    } catch (error) {
      console.error("Error resubmitting requirement:", error);
      setError("Hiba történt az újraküldés során. Kérjük próbáld újra később.");
      toast.error("Hiba történt az újraküldés során");
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Loading Overlay */}
      {isResubmitting && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-3" />
            <p className="text-base font-medium text-gray-700">Követelmény feldolgozása folyamatban...</p>
            <p className="text-sm text-gray-500 mt-1">Kérem várjon, ez eltarthat néhány pillanatig</p>
          </div>
        </div>
      )}
      
      <div className="space-y-6 flex-grow">
        {/* Header with back button */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={onBack}
            disabled={isResubmitting}
            className={`flex items-center ${isResubmitting ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Vissza az ajánlathoz
          </button>
        </div>

        {/* Requirement Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {requirement.title || "Követelmény részletei"}
            </h1>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1"
              >
                <Edit className="h-4 w-4 mr-1" />
                Szerkesztés
              </Button>
            )}
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Leírás</h2>
              {isEditing ? (
                <div className="space-y-4">
                  {currentDescription && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-line">
                        {currentDescription}
                      </p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      Kiegészítő információk
                    </h3>
                    <Textarea
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Írd ide a további követelményeket vagy módosításokat..."
                    />
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-wrap gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setError("");
                          setNewText("");
                        }}
                        disabled={isSubmitting || isResubmitting}
                        className="flex-1 min-w-[120px]"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Mégse
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={
                          isSubmitting || isResubmitting || !newText.trim()
                        }
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Mentés...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Csak mentés
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleResubmit}
                        disabled={
                          isSubmitting || isResubmitting || !newText.trim()
                        }
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 min-w-[120px] relative"
                      >
                        <span className={`flex items-center ${isResubmitting ? 'invisible' : 'visible'}`}>
                          <Send className="h-4 w-4 mr-2" />
                          Újra beküldés
                        </span>
                        {isResubmitting && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  {currentDescription ? (
                    <p className="text-gray-700 whitespace-pre-line">
                      {currentDescription}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">Nincs leírás megadva</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Státusz
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {requirement.status || "Aktív"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
