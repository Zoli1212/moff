"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { createSubscription } from "@/actions/subscription-actions";

interface PricingPlan {
  id: number;
  title: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  priceIdMonthly?: string;
  priceIdYearly?: string;
  benefits: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    id: 1,
    title: "Profi",
    description: "14 napos ingyenes próbaidőszak",
    priceMonthly: "29 000 Ft",
    priceYearly: "290 000 Ft",
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
    priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY,
    benefits: [
      "Korlátlan ajánlat készítés",
      "Korlátlan munka kezelés",
      "Feladat menedzsment",
      "Munkaerő menedzsment",
      "Eszköz menedzsment",
      "Anyag menedzsment",
      "Teljesítmény napló",
      "Költségvetés monitoring",
      "Profit ráta elemzés",
      "Számlázás",
    ],
  },
  {
    id: 2,
    title: "Prémium",
    description: "Teljes körű megoldás vállalkozásoknak",
    priceMonthly: "59 000 Ft",
    priceYearly: "590 000 Ft",
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM,
    priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY,
    benefits: [
      "Korlátlan ajánlat készítés",
      "Korlátlan munka kezelés",
      "Feladat menedzsment",
      "Munkaerő menedzsment",
      "Eszköz menedzsment",
      "Anyag menedzsment",
      "Teljesítmény napló",
      "Költségvetés monitoring",
      "Profit ráta elemzés",
      "Számlázás",
      "Automata beszerzési segéd",
      "Automata munkaterv segéd",
      "Automata raktárkészlet kezelés",
    ],
  },
];

export function PricingTable() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      <div className="max-w-5xl mx-auto text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Válassz csomagot
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Válassz egy előfizetési csomagot az összes eszköz eléréséhez
        </p>

        {/* Toggle havi/éves */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-500"}`}
          >
            Havi
          </span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isYearly ? "bg-[#FE9C00]" : "bg-gray-200"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isYearly ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span
            className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-500"}`}
          >
            Éves
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.id === 2 ? "border-[#FE9C00] border-2" : ""}
          >
            <CardHeader>
              <CardTitle>
                {plan.id === 2 ? (
                  <div className="flex items-center justify-between">
                    <h3 style={{ color: "#FE9C00" }}>{plan.title}</h3>
                    <p className="rounded-full bg-[#FE9C00]/20 px-3 py-1 text-xs font-semibold leading-5 text-[#FE9C00]">
                      Legnépszerűbb
                    </p>
                  </div>
                ) : (
                  <h3>{plan.title}</h3>
                )}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mt-6 text-4xl font-bold tracking-tight">
                {isYearly ? plan.priceYearly : plan.priceMonthly}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                /{isYearly ? "év" : "hónap"}
              </p>

              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="flex gap-x-3">
                    <Check className="text-[#FE9C00] size-5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <form className="w-full" action={createSubscription}>
                <input
                  type="hidden"
                  name="priceId"
                  value={
                    isYearly ? plan.priceIdYearly : plan.priceIdMonthly
                  }
                />
                <Button
                  type="submit"
                  className="mt-5 w-full"
                  style={{
                    backgroundColor: "#FE9C00",
                    color: "white",
                  }}
                >
                  Csomag kiválasztása
                </Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
