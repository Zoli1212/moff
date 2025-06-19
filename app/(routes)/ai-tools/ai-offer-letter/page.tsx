"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useOfferLetterStore } from "@/store/offerLetterStore";

export default function OfferLetterGenerator() {
  const router = useRouter();
  const { offerText, setOfferText } = useOfferLetterStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerText.trim()) {
      setError("Kérjük adj meg egy szöveget az elemzéshez!");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const recordId = uuidv4();

      // Send the text to the API
      const formData = new FormData();
      formData.append("recordId", recordId);
      formData.append("textContent", offerText);
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
            setIsLoading(false);
            // History will be created by the backend
            router.push(`/ai-tools/ai-offer-letter${recordId}`);
            return;
          }

          if (status === "Cancelled" || attempts >= maxAttempts) {
            setIsLoading(false);
            alert("Az elemzés nem sikerült vagy túl sokáig tartott.");
            return;
          }

          attempts++;
          setTimeout(poll, 2000);
        } catch (err) {
          console.error("Error polling status:", err);
          setIsLoading(false);
          alert("Hiba történt az állapot lekérdezése során.");
        }
      };

      poll();
    } catch (err) {
      console.error("Error processing text:", err);
      setError("Hiba történt a feldolgozás során. Kérjük próbáld újra később.");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Ajánlatlevél Generátor</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="offer-text"
            className="block text-sm font-medium mb-2"
          >
            Illessze be az elemzendő szöveget:
          </label>
          <Textarea
            id="offer-text"
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            placeholder="Például: Üdvözlöm! Szeretnék ajánlatot kérni egy 50 négyzetméteres iroda felújítására..."
            className="min-h-[200px]"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Folyamatban...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generálás
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
