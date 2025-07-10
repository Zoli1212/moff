"use client";
import Image from "next/image";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/theme-store";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme: currentTheme } = useThemeStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isLoaded && user) {
      router.push("/dashboard");
    }
  }, [user, isLoaded, router]);

  if (!isMounted || !isLoaded || user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="relative h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <div className="fixed inset-0 -z-10">
            <Image
              src={`/${currentTheme || "landing"}.jpg`}
              alt="Background image"
              fill
              priority
              className="object-cover"
              style={{ objectPosition: "center bottom" }}
              sizes="100vw"
            />
          </div>
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Login Button */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <SignInButton mode="modal">
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-4 px-12 rounded-full shadow-lg transform hover:scale-105 transition-all text-lg">
              Bejelentkezés
            </button>
          </SignInButton>
        </div>
      </main>
    </div>
  );
}
