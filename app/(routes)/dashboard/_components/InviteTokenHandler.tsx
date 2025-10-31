"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useInviteToken } from "@/actions/invite-actions";

/**
 * Komponens ami ellenőrzi van-e pending invite token localStorage-ban
 * és automatikusan aktiválja a trial-t regisztráció után
 */
export function InviteTokenHandler() {
  const { user, isLoaded } = useUser();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || processing) return;

    const activatePendingInvite = async () => {
      // Ellenőrizzük van-e pending token
      const pendingToken = localStorage.getItem('pendingInviteToken');
      
      if (!pendingToken) return;

      setProcessing(true);

      try {
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!email) return;

        // Trial aktiválása
        const result = await useInviteToken(pendingToken, email);

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
  }, [isLoaded, user, processing]);

  // Ez a komponens nem renderel semmit, csak háttérben fut
  return null;
}
