"use client";

import { useClerk } from "@clerk/nextjs";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LogOut } from "lucide-react";

export function SignOutBtn() {
  const { t } = useLocale();

  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      {t("x.exit")}
    </button>
  );
}
