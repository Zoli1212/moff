"use client";
import React from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";

interface DiaryTypeSelectorProps {
  diaryType: "workers" | "contractor";
  onChange: (type: "workers" | "contractor") => void;
}

export default function DiaryTypeSelector({ diaryType, onChange }: DiaryTypeSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="flex gap-4 mb-6 justify-center space-x-4">
      <Button
        variant={diaryType === "workers" ? "default" : "outline"}
        onClick={() => onChange("workers")}
        className="px-6 py-2 text-base font-semibold rounded-lg"
      >
        {t("x.workersDiary")}
      </Button>
      <Button
        variant={diaryType === "contractor" ? "default" : "outline"}
        onClick={() => onChange("contractor")}
        className="px-6 py-2 text-base font-semibold rounded-lg"
      >
        {t("x.thisDiary")}
      </Button>
    </div>
  );
}
