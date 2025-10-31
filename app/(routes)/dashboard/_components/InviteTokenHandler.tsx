"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useInviteToken as activateInviteToken } from "@/actions/invite-actions";

/**
 * Komponens ami ellenőrzi van-e pending invite token localStorage-ban
 * és automatikusan aktiválja a trial-t regisztráció után
 */
export function InviteTokenHandler() {
  const { user, isLoaded } = useUser();
  const [processing, setProcessing] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || processing || hasRun.current) return;
    
    hasRun.current = true;

    const activatePendingInvite = async () => {
      // Ellenőrizzük van-e pending token
      const pendingToken = localStorage.getItem('pendingInviteToken');
      
      if (!pendingToken) return;

      setProcessing(true);

      try {
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!email) return;

        // Trial aktiválása
        const result = await activateInviteToken(pendingToken, email);

        if (result.success) {
          // Token törlése localStorage-ból
          localStorage.removeItem('pendingInviteToken');
          
          console.log('✅ 14 napos trial aktiválva!');
        }
      } catch (error) {
        console.error('Hiba a trial aktiválása során:', error);
      } finally {
        setProcessing(false);
      }
    };

    activatePendingInvite();
  }, [isLoaded, user]);

  // Ez a komponens nem renderel semmit, csak háttérben fut
  return null;
}
