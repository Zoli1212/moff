"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useDemandStore } from "@/store/offerLetterStore";
import { useOfferItemQuestionStore } from "@/store/offerItemQuestionStore";
import { useOfferItemCheckStore } from "@/store/offerItemCheckStore";

interface TextInputDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function TextInputDialog({
  open,
  setOpen,
}: TextInputDialogProps) {
  const { demandText, setDemandText } = useDemandStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { clearOfferItemsQuestion } = useOfferItemQuestionStore();
  const { clearOfferItems } = useOfferItemCheckStore();
  const { clearExtraRequirementText } = useDemandStore();

  useEffect(() => {
    clearOfferItemsQuestion();
    clearOfferItems();
    clearExtraRequirementText();
  }, [clearOfferItemsQuestion, clearOfferItems, clearExtraRequirementText]);

  const onAnalyze = async () => {
    if (!demandText.trim()) {
      setError("Kérjük adj meg egy szöveget az elemzéshez!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Új OpenAI endpoint használata (nincs Inngest, History)
      const result = await axios.post("/api/openai-offer", {
        userInput: demandText,
        existingItems: [],
      });

      const { success, workId, requirementId, offerId } = result.data;

      if (success) {
        console.log("Offer created:", { workId, requirementId, offerId });

        // Átirányítás az offer részletekhez
        setLoading(false);
        router.push(`/offers/${requirementId}?offerId=${offerId}`);
        setOpen(false);
      } else {
        throw new Error("Offer creation failed");
      }
    } catch (err) {
      console.error("Error processing text:", err);
      setError("Hiba történt a feldolgozás során. Kérjük próbáld újra később.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] max-h-[800px] flex flex-col">
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
            <DialogHeader className="px-1">
              <DialogTitle className="text-xl font-bold text-gray-900">
                Új ajánlatkérés
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Illessze be az ajánlatkérést vagy írja le részletesen mire van
                szüksége
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 mt-4 overflow-hidden">
              <div className="h-full flex flex-col">
                <Textarea
                  placeholder="Például: 50m²-es lakás felújítása, burkolással, festéssel és villanyszereléssel..."
                  className="flex-1 min-h-[200px] text-base p-4 resize-none"
                  value={demandText}
                  onChange={(e) => {
                    setDemandText(e.target.value);
                    setError("");
                  }}
                />
                {error && (
                  <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-md">
                    {error}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-3">Tippek:</div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Minden fontos információt írjon le</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Adja meg a pontos helyszínt</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Mikorra lenne szüksége a munkákra?</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 mt-auto">
              <Button
                variant="outline"
                className="w-full h-14 text-base font-medium"
                onClick={() => setOpen(false)}
              >
                Mégse
              </Button>
              <Button
                className="w-full h-14 text-base font-medium bg-[#FF9900] hover:bg-[#e68a00] text-white"
                disabled={!demandText.trim() || loading}
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
                    Elemzés indítása
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
