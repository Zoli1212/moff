"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useDemandStore } from "@/store/offerLetterStore";

export default function OfferLetterGenerator() {
  const router = useRouter();
  const { demandText, setDemandText } = useDemandStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandText.trim()) {
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
      formData.append("textContent", demandText);
      formData.append("type", "offer-letter");

      const result = await axios.post("/api/ai-demand-agent", formData);
      const { eventId } = result.data;
      console.log("Event queued:", eventId);

      // Azonnal átirányítunk a redirect oldalra, ahol database polling fog történni
      setIsLoading(false);
      router.push(`/ai-tools/ai-offer-letter-mobile-redirect/${recordId}`);
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
            value={demandText}
            onChange={(e) => setDemandText(e.target.value)}
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
