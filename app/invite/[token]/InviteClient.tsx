"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInviteToken } from "@/actions/invite-actions";
import { Loader2 } from "lucide-react";

export default function InviteClient({
  token,
  createdBy,
}: {
  token: string;
  createdBy: string;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // Token mentése localStorage-ba (mobilon is működik)
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingInviteToken', token);
      }
      // Átirányítás sign-up oldalra
      router.push(`/sign-up`);
      return;
    }

    // Ha be van jelentkezve, aktiváljuk a trial-t
    activateTrial();
  }, [isLoaded, user]);

  const activateTrial = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;

    setProcessing(true);
    const email = user.emailAddresses[0].emailAddress;

    const result = await useInviteToken(token, email);

    if (result.success) {
      // Sikeres aktiválás, átirányítás a főoldalra
      setTimeout(() => {
        router.push("/works");
      }, 2000);
    } else {
      setError(result.error || "Hiba történt");
      setProcessing(false);
    }
  };

  if (!isLoaded || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">
            {!isLoaded ? "Betöltés..." : "14 napos trial aktiválása..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Hiba</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Vissza a főoldalra
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Sikeres aktiválás!
        </h1>
        <p className="text-gray-300 mb-2">
          14 napos Pro trial aktiválva
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Meghívó: {createdBy}
        </p>
        <p className="text-sm text-gray-500">
          Átirányítás a munkák oldalra...
        </p>
      </div>
    </div>
  );
}
