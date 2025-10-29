import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-20 h-20 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Sikeres fizetés!
        </h1>
        
        <p className="text-gray-600 mb-8">
          Az előfizetésed sikeresen aktiválódott. Most már teljes hozzáféréssel rendelkezel az összes funkcióhoz.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard">
              Tovább a Dashboard-ra
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/billing">
              Előfizetés kezelése
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
