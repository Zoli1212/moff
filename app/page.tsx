"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LandingHeader from "./_components/landing/LandingHeader";
import LandingHero from "./_components/landing/LandingHero";
import LandingFeatures from "./_components/landing/LandingFeatures";
import LandingAudiences from "./_components/landing/LandingAudiences";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
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
    <div className="min-h-screen bg-stone-50">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingAudiences />
      </main>
    </div>
  );
}
