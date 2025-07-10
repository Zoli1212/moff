"use client";
import Image from "next/image";
import { FileText, Wrench, DollarSign } from "lucide-react";
import Link from "next/link";
import { useThemeStore } from "@/store/theme-store";
import { usePositionStore } from "@/store/position-store";
import DraggableIcon from "@/components/DraggableIcon";

export default function Dashboard() {
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

        <DraggableIcon 
          id="jobs"
          position={positions.jobs}
          onPositionChange={(x, y) => updatePosition('jobs', x, y)}
        >
          <Link href="/jobs" className="block w-20 h-20">
            <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
              <Wrench className="text-orange-500" size={32} />
            </div>
          </Link>
        </DraggableIcon>

        <DraggableIcon 
          id="billings"
          position={positions.billings}
          onPositionChange={(x, y) => updatePosition('billings', x, y)}
        >
          <Link href="/dashboard/billings" className="block w-20 h-20">
            <div className="w-full h-full rounded-full border-2 border-orange-500 flex items-center justify-center bg-transparent hover:bg-white/20 transition-all duration-200 shadow-lg">
              <DollarSign className="text-orange-500" size={32} />
            </div>
          </Link>
        </DraggableIcon>
      </div>
    </div>
  );
}
