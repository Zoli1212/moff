import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function Billing() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 1rem" }}>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-black hover:opacity-70 transition-opacity mb-6"
      >
        <ChevronLeft size={24} />
        <span>Vissza</span>
      </Link>
      <h2 className="font-bold text-3xl text-center">Válassz csomagot</h2>
      <p className="text-lg text-center mt-2">
        Válassz egy előfizetési csomagot az összes AI eszköz eléréséhez
      </p>
      <div className="mt-6" />

      <div className="flex flex-row flex-wrap gap-4 justify-center items-stretch">
        <PricingTable />
      </div>
    </div>
  );
}
