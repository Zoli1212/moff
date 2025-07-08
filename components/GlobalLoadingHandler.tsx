"use client";

import { useEffect } from "react";
import { useDemandStore } from "@/store/offerLetterStore";

export function GlobalLoadingHandler() {
  const { isGlobalLoading, setGlobalLoading } = useDemandStore();

  useEffect(() => {
    // Check for loading state in session storage on mount
    const checkLoadingState = () => {
      if (typeof window === 'undefined') return;
      
      const wasLoading = sessionStorage.getItem('isGlobalLoading') === 'true';
      if (wasLoading) {
        setGlobalLoading(true);
        
        // Clear the loading state after a short delay
        const timer = setTimeout(() => {
          setGlobalLoading(false);
          sessionStorage.removeItem('isGlobalLoading');
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    };

    checkLoadingState();
  }, [setGlobalLoading]);

  return null;
}
