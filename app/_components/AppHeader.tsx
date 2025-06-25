"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <div className="w-full fixed top-0 left-0 right-0 z-40 px-4 py-3">
      <div className="relative w-full">
        <input
          type="text"
          className="w-full pl-4 pr-10 py-2 rounded-lg bg-white/70 border-0 focus:ring-2 focus:ring-orange-500 focus:outline-none text-base placeholder-gray-500"
          placeholder="Mit parancsolsz?"
        />
        <button 
          onClick={toggleSidebar}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-500 p-1"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
