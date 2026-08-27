"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
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
import { useRequirementIdStore } from "@/store/requirement-id-store";

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
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
  questions: initialQuestions = [],
  currentItems = [],
  requirementId,
  requirementDescription = "",
  currentOfferId,
  onOfferUpdated,
}: TextInputDialogProps & { currentItems?: OfferItemQuestion[] }) {
  const { t } = useLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const router = useRouter();

  // Get the setOfferItems function and current items from the store
  const { setOfferItemsQuestion, offerItemsQuestion, clearOfferItemsQuestion } =
    useOfferItemQuestionStore();
  const { clearRequirementId } = useRequirementIdStore();
  const prevItemsRef = useRef(currentItems);
  const questionsInitializedRef = useRef(false);
  console.log(offerItemsQuestion);

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

    // Remove the question from the offer description (UI update only)
    if (currentOfferId) {
      try {
        const result = await removeQuestionFromOffer(
          currentOfferId,
          questionToRemove.text
        );
        if (result.description && onOfferUpdated) {
          onOfferUpdated(result.description);
        }
      } catch (error) {
        console.error("Error removing question from offer:", error);
      }
    }

    // NOTE: We do NOT update the old requirement in the database
    // The removed question will simply not appear in the new offer
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
        setError(t("x.answerAtLeastOne"));
        setLoading(false);
        return;
      }

      let answersText = "";
      answeredQuestions.forEach(({ text, answer }) => {
        answersText += `\n✓ MEGVÁLASZOLT: ${text}\n  Válasz: ${answer}\n`;
      });

      // NOTE: We do NOT update the old requirement in the database
      // We only prepare the description in memory with the answers
      // The new requirement will be created by offer-actions.ts with updateCount=2, questionCount=1

      // Prepare the combined text with original requirement and answers (in memory only)
      let finalDescription = requirementDescription;
      const answersMatch = requirementDescription.match(
        /Válaszok a kérdésekre:([\s\S]*?)(?=\n\n|$)/
      );

      if (answersMatch) {
        // If there's already an answers section, append the new answers to it
        finalDescription = requirementDescription.replace(
          answersMatch[0],
          `Válaszok a kérdésekre:${answersMatch[1]}${answersText}`
        );
      } else {
        // If no answers section exists, add it at the end
        finalDescription = `${requirementDescription}\n\nVálaszok a kérdésekre:${answersText}`;
      }

      // finalDescription már tartalmazza az eredeti követelményt + a t("od.answers") részt
      const combinedText = finalDescription;

      // Validate required parameters
      if (!requirementId) {
        throw new Error("RequirementId is missing");
      }
      if (!currentOfferId) {
        throw new Error("CurrentOfferId is missing");
      }

      console.log("📤 Sending API request with:", {
        requirementId,
        currentOfferId,
        itemsCount: currentItems?.length || 0,
      });

      // Call the new OpenAI offer update API
      const response = await fetch("/api/openai-offer-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: combinedText,
          existingItems: currentItems || [],
          answeredQuestions: answeredQuestions.map((q) => q.text),
          requirementId: requirementId,
          currentOfferId: currentOfferId,
        }),
      });

      if (!response.ok) {
        throw new Error(t("x.offerUpdateError"));
      }

      const result = await response.json();
      console.log("✅ API Response:", result);

      if (!result.success) {
        throw new Error(
          result.error || t("x.offerUpdateError")
        );
      }

      console.log("📋 Result data:", {
        requirementId: result.requirementId,
        offerId: result.offerId,
      });

      // Delete the old offer if we have currentOfferId
      if (currentOfferId) {
        console.log("🗑️ Deleting old offer:", currentOfferId);
        try {
          const deleteResult = await deleteOffer(currentOfferId);

          if (!deleteResult.success) {
            console.error("Failed to delete old offer:", deleteResult.error);
          } else {
            console.log("✅ Old offer deleted");
          }
        } catch (deleteErr) {
          console.error("Error deleting old offer:", deleteErr);
          // Don't block the flow if deletion fails
        }
      }

      // Redirect to the new offer
      const redirectUrl = `/offers/${result.requirementId}?offerId=${result.offerId}`;
      console.log("🔀 Redirecting to:", redirectUrl);

      setLoading(false);
      setOpen(false);

      console.log("🚀 Calling router.push...");
      router.push(redirectUrl);
      console.log("✅ router.push called");
    } catch (err) {
      console.error("❌ Error processing text:", err);
      console.error(
        "❌ Error details:",
        err instanceof Error ? err.message : String(err)
      );
      setError(t("td.processError"));
      setLoading(false);
    } finally {
      console.log("🏁 Finally block - ensuring loading is false");
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Clear store when dialog closes
    if (!isOpen) {
      clearRequirementId();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] max-h-[800px] flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {t("td.processingInProgress")}
            </h3>
            <p className="text-gray-600 max-w-md">
              {t("td.pleaseWait")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-6 pb-0">
              <DialogHeader className="px-1">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {t("x.answerQuestions")}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {t("x.answerRequestQuestions")}
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
                        title={t("x.removeQuestion")}
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
                      placeholder={t("x.typeAnswerHere")}
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
                      <span>{t("td.describeAll")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{t("x.answerBriefly")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{t("x.enterDeadlinesUnits")}</span>
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
                      {t("od.updateOffer")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-medium bg-gray-100 hover:bg-gray-200"
                  disabled={loading}
                  onClick={() => {
                    setOpen(false);
                    // Clear the requirementId from store
                    clearRequirementId();
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
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
