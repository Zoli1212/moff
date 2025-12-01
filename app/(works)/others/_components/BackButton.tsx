"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export default function BackButton({ onClick, size = "md" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <button
      onClick={handleBack}
      className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
      aria-label="Vissza"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={sizeClasses[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
