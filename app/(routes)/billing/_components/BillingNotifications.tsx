"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BillingNotifications() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const canceled = searchParams.get("canceled");

    if (canceled === "true") {
      toast.error("Előfizetés megszakítva", {
        description: "Az előfizetési folyamat megszakadt. Próbáld újra később!",
        duration: 5000,
      });
      // Remove query params from URL after toast is shown
      setTimeout(() => {
        router.replace("/billing");
      }, 100);
    }
  }, [searchParams, router]);

  return null;
}
