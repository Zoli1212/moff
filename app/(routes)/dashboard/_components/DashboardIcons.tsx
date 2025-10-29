"use client";

import Image from "next/image";
import { FileText, Wrench, DollarSign } from "lucide-react";
import Link from "next/link";
import { useThemeStore } from "@/store/theme-store";
import { usePositionStore } from "@/store/position-store";
import DraggableIcon from "@/components/DraggableIcon";

interface DashboardIconsProps {
  isTenant: boolean;
}

export default function DashboardIcons({ isTenant }: DashboardIconsProps) {
  const { theme } = useThemeStore();
  const { positions, updatePosition } = usePositionStore();

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

      {/* Ikonok */}
      <div className="relative w-full h-full">
        {/* Offers - Only for tenants */}
        {isTenant && (
          <DraggableIcon 
            id="offers"
            position={positions.offers}
            onPositionChange={(x, y) => updatePosition('offers', x, y)}
          >
            <Link href="/offers" className="block w-20 h-20">
              <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
                <FileText className="text-orange-500" size={32} />
              </div>
            </Link>
          </DraggableIcon>
        )}

        {isTenant ? (
          <DraggableIcon 
            id="works"
            position={positions.jobs}
            onPositionChange={(x, y) => updatePosition('jobs', x, y)}
          >
            <Link href="/works" className="block w-20 h-20">
              <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
                <Wrench className="text-orange-500" size={32} />
              </div>
            </Link>
          </DraggableIcon>
        ) : (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:left-[calc(50%+7rem)]">
            <Link href="/works" className="block w-20 h-20">
              <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
                <Wrench className="text-orange-500" size={32} />
              </div>
            </Link>
          </div>
        )}

        {/* Billings - Only for tenants */}
        {isTenant && (
          <DraggableIcon 
            id="billings"
            position={positions.billings}
            onPositionChange={(x, y) => updatePosition('billings', x, y)}
          >
            <Link href="/billings" className="block w-20 h-20">
              <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
                <DollarSign className="text-orange-500" size={32} />
              </div>
            </Link>
          </DraggableIcon>
        )}
      </div>
    </div>
  );
}
