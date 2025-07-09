"use client";
import Image from "next/image";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTheme } from "@/actions/theme.actions";
import { Palette, X } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme: currentTheme, setTheme, initializeTheme } = useThemeStore();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (!isLoaded) return;

    if (user) {
      // If user is logged in, sync theme with database
      useThemeStore.getState().syncThemeWithDb(user.id);
      router.push("/dashboard");
      return;
    }

    // For non-logged in users, initialize theme from server
    const loadTheme = async () => {
      try {
        const theme = await getTheme();
        if (theme) {
          initializeTheme(theme);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };

    loadTheme();
  }, [user, isLoaded, router, initializeTheme]);

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

        {/* Theme Toggle Button - Bottom Right */}
        <div className="fixed bottom-6 right-6 z-10 flex flex-col items-end space-y-2">
          {showThemeSelector && (
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow-lg mb-2">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-white text-sm font-medium">
                  Válassz hátteret
                </h2>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex space-x-2">
                {(["landing", "corporate", "common"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => {
                      setTheme(theme);
                      setShowThemeSelector(false);
                    }}
                    className={`p-2 rounded-md transition-all ${
                      currentTheme === theme
                        ? "bg-orange-500 text-white"
                        : "bg-white/20 text-white/80 hover:bg-white/30"
                    }`}
                    title={theme.charAt(0).toUpperCase() + theme.slice(1)}
                  >
                    {theme.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all flex items-center space-x-2 text-white/80 hover:text-white"
          >
            {showThemeSelector ? (
              <X size={20} />
            ) : (
              <>
                <Palette size={20} />
                <span className="text-sm font-medium">Háttér</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
