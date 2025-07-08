"use client";

import { useEffect, useState } from "react";
import { useDemandStore } from "@/store/offerLetterStore";
import { Loader2 } from "lucide-react";

export function GlobalLoading() {
  const { isGlobalLoading } = useDemandStore();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Show loading with a small delay to prevent flickering
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isGlobalLoading) {
      setShouldShow(true);
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 100);
    } else {
      setIsVisible(false);
      timeout = setTimeout(() => {
        setShouldShow(false);
      }, 300); // Match this with the transition duration
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isGlobalLoading]);

  if (!shouldShow) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-[90%] mx-4 text-center">
        <div className="flex justify-center mb-6">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Feldolgozás folyamatban
        </h3>
        <p className="text-gray-600">
          Az Ön kérése feldolgozás alatt áll, kérjük várjon...
        </p>
        <div className="mt-6 text-sm text-gray-500">
          Ez eltarthat néhány másodpercig
        </div>
      </div>
    </div>
  );
}
