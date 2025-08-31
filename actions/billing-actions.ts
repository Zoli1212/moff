"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

interface OfferItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

interface CreateBillingData {
  title: string;
  offerId: number;
  items: OfferItem[];
}

export async function getBillings() {
  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
      throw new Error("Nincs bejelentkezve felhasználó!");
    }

    const billings = await prisma.billing.findMany({
      where: {
        tenantEmail: userEmail,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return billings.map((billing) => ({
      ...billing,
      items: billing.items ? JSON.parse(billing.items as string) : [],
    }));

  } catch (error) {
    console.error("Error fetching billings:", error);
    throw new Error("Failed to fetch billings");
  }
}

export async function createBilling(data: CreateBillingData) {
  const { offerId, items, title } = data;

  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
      throw new Error("Nincs bejelentkezve felhasználó!");
    }

    if (!items || items.length === 0) {
      throw new Error("Nincsenek tételek a számlához.");
    }

    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const billing = await prisma.billing.create({
      data: {
        title,
        offerId,
        items: JSON.stringify(items),
        totalPrice,
        status: "draft",
        tenantEmail: userEmail,
      },
    });

    revalidatePath("/billings/my-invoices");

    return {
      success: true,
      billingId: billing.id,
    };
  } catch (error) {
    console.error("Error creating billing:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ismeretlen hiba történt a számla létrehozásakor.",
    };
  }
}
