"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BillingNotifications() {
  const { t } = useLocale();

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const canceled = searchParams.get("canceled");

    if (canceled === "true") {
      toast.error(t("x.subscriptionCancelled"), {
        description: t("x.subscriptionAborted"),
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
