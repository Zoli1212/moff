"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { saveOfferWithRequirements } from "@/actions/offer-actions";
import { useDemandStore } from "@/store/offerLetterStore";

export default function SilentOfferSaverPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const recordid = params.recordid?.toString();
  const [isProcessing, setIsProcessing] = useState(true);
  const { demandText } = useDemandStore();
  
  // Get demandText from URL or localStorage
  const demandTextToUse = searchParams?.get('demandText') || 
                         localStorage.getItem('lastDemandText') || 
                         demandText;

  const saveOfferStatus = (recordId: string) => {
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

  const getSavedStatus = (recordId: string) => {
    if (typeof window === "undefined") return false;
    const savedOffers = JSON.parse(localStorage.getItem("savedOffers") || "{}");
    const savedOffer = savedOffers[recordId];
    return savedOffer && savedOffer.expires > Date.now();
  };
  console.log(isProcessing)

  useEffect(() => {
    const fetchAndSaveOffer = async () => {
      if (!recordid) {
        console.error("Missing recordid");
        setIsProcessing(false);
        return;
      }

      // Check if this offer was already saved
      if (getSavedStatus(recordid)) {
        console.log("Offer was already saved, skipping save");
        // Redirect to offers list or handle as needed
        router.push('/offers');
        return;
      }

      try {
        const response = await axios.get(`/api/ai-offer-letter/${recordid}`);
        const offer = response.data;

        console.log("Offer loaded:", offer);

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

        // 2) Save to DB
        console.log('Saving with demandText:!!', demandTextToUse, contentToSave);
        const result = await saveOfferWithRequirements({
          recordId: recordid,
          demandText: demandTextToUse || "",
          offerContent: contentToSave,
        });

        if (result.success && result.requirementId && result.offerId) {
          console.log("Offer saved to database", result);
          toast.success("Ajánlat sikeresen lementve!");

          // Redirect to the target URL
          const targetUrl = `/offers/${result.requirementId}?offerId=${result.offerId}`;
          console.log("Redirecting to", targetUrl);
          router.push(targetUrl);
        } else {
          console.error("Database save failed or missing IDs", result);
          toast.error(result.error || "Hiba a mentés közben.");
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("Error fetching or saving offer:", error);
        toast.error("Hiba történt az ajánlat mentése közben.");
        setIsProcessing(false);
      }
    };

    fetchAndSaveOffer();
  }, [recordid, router]);

  return null; // nincs UI
}
