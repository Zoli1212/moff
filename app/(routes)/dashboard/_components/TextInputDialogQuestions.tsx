"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useOfferItemQuestionStore } from "@/store/offerItemQuestionStore";
import { OfferItemQuestion } from "@/types/offer.types";
import { deleteOffer } from "@/actions/delete-offer";
import { removeQuestionFromOffer } from "@/actions/offer-actions";

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toolPath: string;
  questions?: string[];
  requirementId?: number;
  requirementDescription?: string;
  currentOfferId?: number;
  onOfferUpdated?: (updatedDescription: string) => void;
}

interface QuestionWithAnswer {
  id: string;
  text: string;
  answer: string;
}

export default function TextInputDialogQuestions({
  open,
  setOpen,
  toolPath,
  questions: initialQuestions = [],
  currentItems = [],
  requirementId,
  requirementDescription = "",
  currentOfferId,
  onOfferUpdated,
}: TextInputDialogProps & { currentItems?: OfferItemQuestion[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const router = useRouter();

  // Get the setOfferItems function and current items from the store
  const { setOfferItemsQuestion, offerItemsQuestion, clearOfferItemsQuestion } =
    useOfferItemQuestionStore();
  const prevItemsRef = useRef(currentItems);
  const questionsInitializedRef = useRef(false);

  // Log when offerItems are updated in the store
  useEffect(() => {
    if (offerItemsQuestion && offerItemsQuestion.length > 0) {
      console.log(
        "Items stored in offerItemsQuestionStore:",
        offerItemsQuestion
      );
    }
  }, [offerItemsQuestion]);

  // Initialize questions with unique IDs when dialog opens
  useEffect(() => {
    if (open && !questionsInitializedRef.current) {
      setQuestions(
        initialQuestions.map((q) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: q,
          answer: "",
        }))
      );
      questionsInitializedRef.current = true;

      // Store the current items in the store when dialog opens and items have changed
      if (
        currentItems &&
        currentItems.length > 0 &&
        JSON.stringify(currentItems) !== JSON.stringify(prevItemsRef.current)
      ) {
        setOfferItemsQuestion(currentItems);
        prevItemsRef.current = currentItems;
      }
    }

    // Reset the ref when dialog closes
    if (!open) {
      questionsInitializedRef.current = false;
    }
  }, [open, initialQuestions, currentItems, setOfferItemsQuestion]);

  const handleAnswerChange = (id: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const handleRemoveQuestion = async (id: string) => {
    // Find the question text before removing it
    const questionToRemove = questions.find((q) => q.id === id);
    if (!questionToRemove) return;

    // Remove from local state immediately for better UX
    setQuestions((prev) => prev.filter((q) => q.id !== id));

    // If we have a currentOfferId, also remove from the database
    if (currentOfferId) {
      try {
        const result = await removeQuestionFromOffer(
          currentOfferId,
          questionToRemove.text
        );
        if (!result.success) {
          console.error(
            "Failed to remove question from offer:",
            result.message
          );
          // Optionally show error to user
        } else if (result.description && onOfferUpdated) {
          // Notify parent component with updated description
          onOfferUpdated(result.description);
        }
      } catch (error) {
        console.error("Error removing question from offer:", error);
      }
    }
  };

  const onAnalyze = async () => {
    setLoading(true);
    setError("");

    // ✅ Kiürítjük a store-t, hogy ne legyen duplikáció a kérdések megválaszolása után
    clearOfferItemsQuestion();

    try {
      // Prepare the answered questions text
      const answeredQuestions = questions.filter((q) => q.answer.trim() !== "");

      if (answeredQuestions.length === 0) {
        setError("Kérjük válaszoljon meg legalább egy kérdést!");
        setLoading(false);
        return;
      }

      let answersText = "";
      answeredQuestions.forEach(({ text, answer }) => {
        answersText += `\nKérdés: ${text}\nVálasz: ${answer}\n`;
      });

      // If we have a requirementId, update the requirement description first
      if (requirementId) {
        // Check if there's already a "Válaszok a kérdésekre:" section
        let updatedDescription = "";
        const answersMatch = requirementDescription.match(
          /Válaszok a kérdésekre:([\s\S]*?)(?=\n\n|$)/
        );

        if (answersMatch) {
          // If there's already an answers section, append the new answers to it
          const existingAnswers = answersMatch[0];
          updatedDescription = requirementDescription.replace(
            existingAnswers,
            `Válaszok a kérdésekre:${answersMatch[1]}${answersText}`
          );
        } else {
          // If no answers section exists, add it at the end
          updatedDescription = `${requirementDescription}\n\nVálaszok a kérdésekre:${answersText}`;
        }

        // Update the requirement in the database
        const updateResponse = await fetch("/api/update-requirement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementId: requirementId,
            data: {
              description: updatedDescription,
              updateCount: { increment: 1 },
            },
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Hiba történt a követelmény frissítése során");
        }
      }

      // Create a new record ID for the new offer
      const recordId = crypto.randomUUID();

      // Prepare the combined text with original requirement and answers
      // Use the UPDATED description that includes all previous answers
      let finalDescription = requirementDescription;

      // If we updated the requirement, use the updated description
      if (requirementId) {
        const answersMatch = requirementDescription.match(
          /Válaszok a kérdésekre:([\s\S]*?)(?=\n\n|$)/
        );
        if (answersMatch) {
          finalDescription = requirementDescription.replace(
            answersMatch[0],
            `Válaszok a kérdésekre:${answersMatch[1]}${answersText}`
          );
        } else {
          finalDescription = `${requirementDescription}\n\nVálaszok a kérdésekre:${answersText}`;
        }
      }

      const combinedText = `Eredeti követelmény: ${finalDescription}\n\nKiegészítő információk: A fenti kérdésekre most válaszoltam, kérlek vedd figyelembe az új válaszokat az ajánlat generálásakor.`;

      // Create form data for the API
      const formData = new FormData();
      formData.append("recordId", recordId);
      formData.append("textContent", combinedText);
      formData.append("type", "offer-letter");

      if (requirementId) {
        formData.append("requirementId", requirementId.toString());
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
            // Delete the old offer if we have currentOfferId
            if (currentOfferId) {
              try {
                console.log("Deleting old offer:", currentOfferId);
                const deleteResult = await deleteOffer(currentOfferId);

                if (deleteResult.success) {
                  console.log("Old offer deleted successfully");
                } else {
                  console.error(
                    "Failed to delete old offer:",
                    deleteResult.error
                  );
                }
              } catch (deleteErr) {
                console.error("Error deleting old offer:", deleteErr);
                // Don't block the flow if deletion fails
              }
            }

            setLoading(false);
            setOpen(false);
            // Redirect to the new offer page with the updated requirement description
            const encodedDemandText = encodeURIComponent(finalDescription);
            router.push(
              `${toolPath}/${recordId}?demandText=${encodedDemandText}`
            );
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setLoading(false);
            setError("A feldolgozás nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setLoading(false);
          setError("Hiba történt az állapot lekérdezése során.");
        }
      };

      poll();
    } catch (err) {
      console.error("Error processing text:", err);
      setError("Hiba történt a feldolgozás során. Kérjük próbáld újra később.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] max-h-[800px] flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Feldolgozás folyamatban
            </h3>
            <p className="text-gray-600 max-w-md">
              Az Ön kérése feldolgozás alatt áll, kérjük várjon...
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-6 pb-0">
              <DialogHeader className="px-1">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Kérdések megválaszolása
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Válaszolja meg az ajánlatkérésre felmerült kérdéseket
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {question.text}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 -mr-2"
                        title="Kérdés eltávolítása"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
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
                    <Textarea
                      placeholder="Ide írja a választ..."
                      className="w-full text-base p-3 resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      value={question.answer}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                ))}

                {error && (
                  <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-md">
                    {error}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-3">Tippek:</div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Minden fontos információt írjon le</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Adja meg a röviden a válaszokat</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Adja meg a határidőket és mértékegységeket</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                <Button
                  className="w-full h-14 text-base font-medium bg-[#FF9900] hover:bg-[#e68a00] text-white"
                  disabled={
                    loading ||
                    questions.length === 0 ||
                    questions.some((q) => !q.answer.trim())
                  }
                  onClick={onAnalyze}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Folyamatban...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Ajánlat frissítése
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-medium bg-gray-100 hover:bg-gray-200"
                  disabled={loading}
                  onClick={() => {
                    setOpen(false);
                    // Reset questions when closing
                    setQuestions(
                      initialQuestions.map((q) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        text: q,
                        answer: "",
                      }))
                    );
                  }}
                >
                  Mégse
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
