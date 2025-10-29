import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCanceled() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircle className="w-20 h-20 text-gray-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Fizetés megszakítva
        </h1>
        
        <p className="text-gray-600 mb-8">
          A fizetési folyamatot megszakítottad. Ha meggondolod magad, bármikor visszatérhetsz és folytathatod az előfizetést.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/billing">
              Vissza az előfizetésekhez
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/dashboard">
              Vissza a Dashboard-ra
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
