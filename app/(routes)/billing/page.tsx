import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PricingTable } from "@/components/PricingTable";

export default function Billing() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity"
          style={{ color: "#FE9C00" }}
        >
          <ChevronLeft size={24} />
          <span className="font-medium">Vissza</span>
        </Link>
        
        <PricingTable />
      </div>
    </div>
  );
}
