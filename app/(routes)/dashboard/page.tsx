"use client";
import Image from "next/image";
import { FileText, Wrench, DollarSign } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useThemeStore } from "@/store/theme-store";

export default function Dashboard() {
  const { theme } = useThemeStore();

  const { user } = useUser();

  // Sync theme with database when component mounts
  useEffect(() => {
    if (user?.id) {
      useThemeStore.getState().syncThemeWithDb(user.id);
    }
  }, [user]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Háttérkép */}
      <div className="fixed inset-0 -z-10">
        <Image
          src={`/${theme || "landing"}.jpg`}
          alt="Background image"
          fill
          priority
          className="object-cover"
          style={{ objectPosition: "center bottom" }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Ikonok pozicionálva fordított háromszögben */}
      <div className="relative w-full h-full">
        {/* Ajánlataim – bal felső sarokban */}
        <Link href="/offers">
          <div className="absolute top-[32%] left-[22%] w-20 h-20 rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
            <FileText className="text-orange-500" size={32} />
          </div>
        </Link>

        {/* Ajánlataim – középtájon, jobbra */}
        <Link href="/jobs">
          <div className="absolute top-[32%] left-[55%] w-20 h-20 rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
            <Wrench className="text-orange-500" size={32} />
          </div>
        </Link>

        {/* Számláim – középen alul */}
        <Link href="/dashboard/billings">
          <div className="absolute top-[68%] left-[38%] w-20 h-20 rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
            <DollarSign className="text-orange-500" size={32} />
          </div>
        </Link>
      </div>
    </div>
  );
}
