"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TechnicalButtonProps {
  workId: string;
}

export default function TechnicalButton({ workId }: TechnicalButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/other/${workId}`);
  };

  return (
    <div className="mt-8 flex justify-end">
      <Button
        onClick={handleClick}
        variant="ghost"
        size="sm"
        className="opacity-20 hover:opacity-40 text-xs text-gray-400 hover:text-gray-600 transition-opacity"
      >
        Tech
      </Button>
    </div>
  );
}
