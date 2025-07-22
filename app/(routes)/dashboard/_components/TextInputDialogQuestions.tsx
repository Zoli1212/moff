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
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useDemandStore } from "@/store/offerLetterStore";
import { useOfferItemQuestionStore } from "@/store/offerItemQuestionStore";

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toolPath: string;
  questions?: string[];
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
  currentItems = []
}: TextInputDialogProps & { currentItems?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const router = useRouter();

  // Get the setOfferItems function and current items from the store
  const { setOfferItemsQuestion, offerItemsQuestion } = useOfferItemQuestionStore();
  const prevItemsRef = useRef(currentItems);

  // Log when offerItems are updated in the store
  useEffect(() => {
    if (offerItemsQuestion && offerItemsQuestion.length > 0) {
      console.log('Items stored in offerItemsQuestionStore:', offerItemsQuestion);
    }
  }, [offerItemsQuestion]);

  // Initialize questions with unique IDs when dialog opens
  useEffect(() => {
    if (open) {
      setQuestions(
        initialQuestions.map((q) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: q,
          answer: "",
        }))
      );
      
      // Store the current items in the store when dialog opens and items have changed
      if (currentItems && currentItems.length > 0 && 
          JSON.stringify(currentItems) !== JSON.stringify(prevItemsRef.current)) {
        setOfferItemsQuestion(currentItems);
        prevItemsRef.current = currentItems;
      }
    }
  }, [open, initialQuestions, currentItems, setOfferItemsQuestion]);

  const handleAnswerChange = (id: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const onAnalyze = async () => {
    setLoading(true);
    setError("");

    try {
      const recordId = uuidv4();
      const formData = new FormData();

      // Get the original demand text from the store
      const { demandText } = useDemandStore.getState();
      console.log("Original demandText:", demandText);

      // Prepare the combined text with original demand and Q&A
      let combinedText = demandText || "";
      const answeredQuestions = questions.filter((q) => q.answer.trim() !== "");

      if (answeredQuestions.length > 0) {
        combinedText += "\n\nVálaszok a kérdésekre:\n";
        answeredQuestions.forEach(({ text, answer }) => {
          combinedText += `\nKérdés: ${text}\nVálasz: ${answer}\n`;
        });
      }

      console.log("Sending combinedText to API:", combinedText);
      formData.append("recordId", recordId);
      formData.append("textContent", combinedText);
      formData.append("type", "offer-letter");

      const result = await axios.post("/api/ai-demand-agent", formData);
      const { eventId } = result.data;
      console.log("Event queued:", eventId);

      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        try {
          const res = await axios.get(
            `/api/ai-demand-agent/status?eventId=${eventId}`
          );
          const { status } = res.data;
          console.log("Status:", status);

          if (status === "Completed") {
            setLoading(false);
            setOpen(false);
            // History will be created by the backend
            router.push(`${toolPath}/${recordId}`);
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setLoading(false);
            alert("Az elemzés nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setLoading(false);
          alert("Hiba történt az állapot lekérdezése során.");
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
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-medium"
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
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
