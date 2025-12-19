import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PricingTable } from "@/components/PricingTable";
import { getUserSubscription, createCustomerPortal } from "@/actions/subscription-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BillingNotifications from "./_components/BillingNotifications";

export const dynamic = 'force-dynamic';

export default async function Billing() {
  const subscription = await getUserSubscription();

  if (subscription) {
    const statusMap: Record<string, string> = {
      active: "Aktív",
      trialing: "Próbaidőszak",
      canceled: "Lemondva",
      past_due: "Lejárt fizetés",
      unpaid: "Fizetetlen",
    };

    const planMap: Record<string, string> = {
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || ""]: "Pro (Havi)",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY || ""]: "Pro (Éves)",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM || ""]: "Premium (Havi)",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY || ""]: "Premium (Éves)",
    };

    return (
      <>
        <BillingNotifications />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity"
            style={{ color: "#FE9C00" }}
          >
            <ChevronLeft size={24} />
            <span className="font-medium">Vissza</span>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Előfizetés kezelése</CardTitle>
              <CardDescription>
                Kezeld az előfizetésedet, módosítsd a fizetési módot vagy mondj le
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Csomag</p>
                  <p className="text-lg font-semibold">
                    {planMap[subscription.stripePriceId] || "Ismeretlen"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Státusz</p>
                  <p className="text-lg font-semibold">
                    {statusMap[subscription.status] || subscription.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Következő fizetés</p>
                  <p className="text-lg font-semibold">
                    {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString("hu-HU")}
                  </p>
                </div>
              </div>

              <form action={createCustomerPortal}>
                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: "#FE9C00" }}
                >
                  Előfizetés kezelése
                </Button>
              </form>

              <p className="text-sm text-gray-500 text-center">
                Az előfizetés kezelése gombra kattintva átirányítunk a Stripe portálra,
                ahol módosíthatod a fizetési módot, csomagot válthatsz vagy lemondhatod az előfizetést.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <BillingNotifications />
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
    </>
  );
}
