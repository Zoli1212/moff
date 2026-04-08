"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClientQuoteSession, acceptQuoteRequest, declineQuoteRequest, getNotifications } from "@/actions/quote-request-actions";
import { Loader2, Sparkles, MapPin, Ruler, User, ArrowLeft } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

interface SessionData {
  sessionId: string;
  clientEmail: string | null;
  clientName: string;
  description: string;
  estimate: string;
  workTypes: string[];
  location: string;
  dimensions: Record<string, unknown> | null;
  status: string;
  createdAt: string | null;
}

export default function FromRequestPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  const [session, setSession] = useState<SessionData | null>(null);
  const [notificationId, setNotificationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [data, notifications] = await Promise.all([
          getClientQuoteSession(sessionId),
          userEmail ? getNotifications(userEmail) : Promise.resolve([]),
        ]);
        if (!data) {
          setError("Az ajánlatkérés nem található.");
        } else {
          setSession(data as SessionData);
          // Find the matching notification
          const match = (notifications as { id: number; sessionId: string | null }[]).find(
            (n) => n.sessionId === sessionId
          );
          if (match) setNotificationId(match.id);
        }
      } catch {
        setError("Hiba történt az adatok betöltésekor.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, userEmail]);

  const handleAccept = async () => {
    if (!session) return;
    setGenerating(true);
    setError("");

    try {
      // Build the input text from client requirements
      const parts: string[] = [];
      parts.push(session.description);
      if (session.location) parts.push(`Helyszín: ${session.location}`);
      if (session.workTypes.length > 0) parts.push(`Munkanemek: ${session.workTypes.join(", ")}`);
      if (session.dimensions) {
        const dim = session.dimensions as Record<string, unknown>;
        if (dim.totalArea) parts.push(`Terület: ${dim.totalArea} m²`);
        if (dim.ceilingHeight) parts.push(`Belmagasság: ${dim.ceilingHeight} m`);
        if (dim.rooms) parts.push(`Szobák száma: ${dim.rooms}`);
      }
      if (session.estimate) parts.push(`\nKliens előzetes becslése:\n${session.estimate}`);

      const userInput = parts.join("\n");

      const result = await axios.post("/api/openai-offer", {
        userInput,
        existingItems: [],
      });

      const { success, requirementId, offerId } = result.data;

      if (success) {
        // Mark notification as accepted
        if (notificationId && userEmail) {
          await acceptQuoteRequest(notificationId, userEmail);
        }
        router.push(`/offers/${requirementId}?offerId=${offerId}`);
      } else {
        throw new Error("Offer creation failed");
      }
    } catch {
      setError("Hiba történt az ajánlat generálásakor. Kérjük próbálja újra.");
      setGenerating(false);
    }
  };

  const handleDecline = async () => {
    if (notificationId && userEmail) {
      await declineQuoteRequest(notificationId, userEmail);
    }
    router.push("/offers");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.push("/offers")}
          className="text-orange-500 hover:text-orange-600 text-sm font-medium"
        >
          Vissza az ajánlatokhoz
        </button>
      </div>
    );
  }

  if (!session) return null;

  const cleanEstimate = session.estimate
    .replace(/\*\*/g, "")
    .replace(/---AJÁNLAT_KEZDET---|---AJÁNLAT_VÉGE---/g, "")
    .trim();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push("/offers")}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Vissza az ajánlatokhoz
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-800">Beérkezett ajánlatkérés</h1>
          <p className="text-sm text-gray-500 mt-1">
            Egy megrendelő ajánlatot kér az alábbi munkákra
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Client info */}
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Megrendelő</p>
              <p className="text-sm text-gray-500">{session.clientName}</p>
            </div>
          </div>

          {/* Location */}
          {session.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Helyszín</p>
                <p className="text-sm text-gray-500">{session.location}</p>
              </div>
            </div>
          )}

          {/* Work types */}
          {session.workTypes.length > 0 && (
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Munkanemek</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {session.workTypes.map((wt, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200"
                    >
                      {wt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dimensions */}
          {session.dimensions && (
            <div className="flex items-start gap-3">
              <Ruler className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Méretek</p>
                {(() => {
                  const dim = session.dimensions as Record<string, unknown>;
                  const parts: string[] = [];
                  if (dim.totalArea) parts.push(`${dim.totalArea} m²`);
                  if (dim.rooms) parts.push(`${dim.rooms} szoba`);
                  if (dim.ceilingHeight) parts.push(`${dim.ceilingHeight} m belmagasság`);
                  return <p className="text-sm text-gray-500">{parts.join(" • ")}</p>;
                })()}
              </div>
            </div>
          )}

          {/* Original description */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Megrendelő leírása</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
              {session.description}
            </div>
          </div>

          {/* Estimate if available */}
          {cleanEstimate && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Előzetes becslés</p>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
                {cleanEstimate}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
          {error && (
            <p className="text-sm text-red-500 w-full mb-2">{error}</p>
          )}
          <button
            onClick={handleAccept}
            disabled={generating}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ajánlat generálása...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Elfogadás — Ajánlat készítése
              </>
            )}
          </button>
          <button
            onClick={handleDecline}
            disabled={generating}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 px-4 rounded-lg border border-gray-200 transition-all"
          >
            Elutasítás
          </button>
        </div>
      </div>
    </div>
  );
}
