"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { saveOfferWithRequirements } from "@/actions/offer-actions";
import { useDemandStore } from "@/store/offerLetterStore";
import { useOfferItemCheckStore } from "@/store/offerItemCheckStore";
import { useRequirementBlockStore } from "@/store/requirementBlockStore";
import { useRequirementIdStore } from "@/store/requirement-id-store";
import { useOfferTitleStore } from "@/store/offer-title-store";
import { FileText } from "lucide-react";
import { useOfferItemQuestionStore } from "@/store/offerItemQuestionStore";

export default function SilentOfferSaverPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const recordid = params.recordid?.toString();
  const [isProcessing, setIsProcessing] = useState(true);
  const { demandText, extraRequirementText } = useDemandStore();
  const { offerItems, clearOfferItems } = useOfferItemCheckStore();
  const { offerItemsQuestion, clearOfferItemsQuestion } =
    useOfferItemQuestionStore();

  // Get demandText from URL or localStorage
  const demandTextToUse =
    searchParams?.get("demandText") ||
    demandText ||
    localStorage.getItem("lastDemandText") ||
    "";

  const saveOfferStatus = (recordId: string) => {
    console.log(recordId);
    if (typeof window === "undefined") return;

    const savedOffers = JSON.parse(localStorage.getItem("savedOffers") || "{}");
    savedOffers[recordId] = {
      saved: true,
      savedAt: new Date().toISOString(),
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 nap
    };
    localStorage.setItem("savedOffers", JSON.stringify(savedOffers));
    console.log("Offer saved in localStorage:", recordId);
  };

  // const getSavedStatus = (recordId: string) => {
  //   if (typeof window === "undefined") return false;
  //   const savedOffers = JSON.parse(localStorage.getItem("savedOffers") || "{}");
  //   const savedOffer = savedOffers[recordId];
  //   return savedOffer && savedOffer.expires > Date.now();
  // };

  useEffect(() => {
    const fetchAndSaveOffer = async () => {
      const requirementId = useRequirementIdStore.getState().requirementId;

      if (!recordid) {
        console.error("Missing recordid");
        setIsProcessing(false);
        return;
      }

      // A DB ellenőrzés már működik a saveOfferWithRequirements-ben
      // Ha már létezik offer ezzel a recordId-vel, akkor visszaadja a meglévőt

      try {
        // Polling: várunk, amíg a History rekord létrejön
        let offer = null;
        let attempts = 0;
        const maxAttempts = 60; // 60 * 2s = 2 perc max

        while (!offer && attempts < maxAttempts) {
          try {
            const response = await axios.get(
              `/api/ai-offer-letter/${recordid}`
            );
            offer = response.data;
            console.log("Offer loaded:", offer);
            break; // Sikeres lekérdezés, kilépünk a loop-ból
          } catch (error: unknown) {
            if (error instanceof AxiosError && error.response?.status === 404) {
              // History rekord még nem létezik, várunk 2 másodpercet
              console.log(
                `Attempt ${attempts + 1}/${maxAttempts}: Waiting for offer...`
              );
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              // Más hiba, kilépünk
              throw error;
            }
          }
        }

        if (!offer) {
          console.error("Offer not found after max attempts");
          toast.error("Az ajánlat nem található. Kérjük próbáld újra később.");
          router.push("/offers");
          return;
        }

        const contentToSave =
          typeof offer.content === "string"
            ? offer.content
            : offer.content?.output?.[0]?.content;

        if (!contentToSave) {
          console.error("No content to save");
          setIsProcessing(false);
          return;
        }

        // 1) Save to localStorage
        saveOfferStatus(recordid);

        // 2) Get block IDs from the store right before saving
        const blockIds = useRequirementBlockStore.getState().blockIds || [];
        console.log("Saving with block IDs:", blockIds);

        if (blockIds.length === 0) {
          console.warn(
            "No block IDs found in store, checking if this is expected..."
          );
        }

        // 3) Save to DB
        console.log(
          "Saving with demandText:!!",
          demandTextToUse,
          contentToSave
        );

        const offerTitle = useOfferTitleStore.getState().offerTitle;
        const result = await saveOfferWithRequirements({
          recordId: recordid,
          demandText: demandTextToUse || "",
          offerContent: contentToSave,
          checkedItems: offerItems,
          extraRequirementText,
          blockIds: blockIds,
          offerItemsQuestion: offerItemsQuestion,
          incrementUpdateCount: true, // Frontend hívás, növeljük az updateCount-ot
          ...(requirementId ? { requirementId } : {}),
          ...(offerTitle ? { offerTitle } : {}),
        });

        console.log("=== SAVE RESULT ===");
        console.log("Result:", result);
        console.log("Result type:", typeof result);
        console.log("Result.success:", result?.success);
        console.log("Result keys:", result ? Object.keys(result) : "null");
        console.log("Full JSON:", JSON.stringify(result, null, 2));
        console.log("===================");

        // Clear extra requirement text after successful save
        if (extraRequirementText) {
          useDemandStore.getState().clearExtraRequirementText();
        }

        if (offerItemsQuestion) {
          clearOfferItemsQuestion();
        }

        if (requirementId) {
          useRequirementIdStore.getState().clearRequirementId();
        }

        if (!result) {
          console.error("❌ No result from server");
          toast.error("Nincs válasz a szervertől");
          router.push("/offers");
          return;
        }

        if (!result.success) {
          console.error("❌ Save failed!");
          console.error("Error:", "error" in result ? result.error : "Unknown");
          console.error("Full result:", JSON.stringify(result, null, 2));
          toast.error(
            "error" in result ? result.error : "Hiba a mentés közben."
          );
          router.push("/offers");
          return;
        }

        if (
          result.success &&
          "requirementId" in result &&
          "offerId" in result &&
          result.requirementId &&
          result.offerId
        ) {
          console.log("Offer saved to database", result);
          toast.success("Ajánlat sikeresen lementve!");

          // Clear the checked items from the store
          if (offerItems && offerItems.length > 0) {
            clearOfferItems();
          }

          if (offerTitle && offerTitle.length > 0) {
            useOfferTitleStore.getState().clearOfferTitle();
          }
          // Redirect to the target URL
          const targetUrl = `/offers/${result.requirementId}?offerId=${result.offerId}`;
          router.push(targetUrl);
          return; // Exit after successful redirect
        }

        // Fallback - redirect to /offers
        console.error("Unexpected result format:", result);
        toast.error("Váratlan válasz formátum");
        router.push("/offers");
      } catch (error) {
        console.error("Error fetching or saving offer:", error);
        toast.error("Hiba történt az ajánlat mentése közben.");
        router.push("/offers");
      }
    };

    fetchAndSaveOffer();
  }, [
    recordid,
    router,
    demandTextToUse,
    offerItems,
    extraRequirementText,
    clearOfferItems,
  ]);

  if (isProcessing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <FileText
            className="animate-spin w-16 h-16"
            style={{ color: "#FE9C00" }}
          />
          <p
            className="text-lg font-mono tracking-widest animate-pulse"
            style={{ color: "#FE9C00" }}
          >
            AJÁNLAT BETÖLTÉSE...
          </p>
        </div>
      </div>
    );
  }

  return null; // No UI when not processing
}
