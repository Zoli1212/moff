"use server";

import { prisma } from "@/lib/prisma";
import { Client, Currency, Language, PaymentMethod } from "@/lib/szamlazz";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
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
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    const billings = await prisma.billing.findMany({
      where: {
        tenantEmail: userEmail,
      },
      orderBy: {
        createdAt: "desc",
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

export async function getBillingById(id: number) {
  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    const billing = await prisma.billing.findFirst({
      where: {
        id,
        tenantEmail: userEmail,
      },
      include: {
        offer: {
          include: {
            work: {
              include: {
                workItems: true,
              },
            },
          },
        },
      },
    });

    if (!billing) {
      return null;
    }

    const otherFinalizedBillings = await prisma.billing.findMany({
      where: {
        offerId: billing.offerId,
        status: "finalized",
        id: { not: billing.id },
      },
    });

    const billedQuantities: { [itemName: string]: number } = {};
    otherFinalizedBillings.forEach((b) => {
      const items = b.items ? JSON.parse(b.items as string) : [];
      items.forEach((item: any) => {
        billedQuantities[item.name] =
          (billedQuantities[item.name] || 0) + (parseFloat(item.quantity) || 0);
      });
    });

    const billItems = billing.items ? JSON.parse(billing.items as string) : [];

    // Only return items that are actually in the billing draft
    const finalItems = billItems;

    return {
      ...billing,
      items: finalItems,
    };
  } catch (error) {
    console.error(`Error fetching billing by id: ${id}`, error);
    return null;
  }
}

export async function finalizeAndGenerateInvoice(billingId: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    const billing = await prisma.billing.findFirst({
      where: {
        id: billingId,
        tenantEmail: tenantEmail,
      },
      include: {
        offer: {
          include: {
            requirement: {
              include: {
                myWork: true,
              },
            },
          },
        },
      },
    });

    if (
      !billing ||
      !billing.offer ||
      !billing.offer.requirement ||
      !billing.offer.requirement.myWork
    ) {
      throw new Error(
        "A számlázáshoz szükséges adatok hiányosak (ügyfél nem található)."
      );
    }

    const customer = billing.offer.requirement.myWork;

    // More robust address parsing
    const location = customer.location || "";
    const zipMatch = location.match(/^\d{4}/);
    const zip = zipMatch ? zipMatch[0] : "";
    // Get everything after the zip code
    const addressWithoutZip = zip ? location.substring(4).trim() : location;
    // Find the first word that is likely a street suffix or contains a number (house number)
    const cityEndIndex = addressWithoutZip.search(
      /\s(utca|út|tér|krt\.|u\.|I|V|X|\d+\.)/
    );

    let city = addressWithoutZip;
    let street = "";

    if (cityEndIndex > 0) {
      city = addressWithoutZip.substring(0, cityEndIndex).trim();
      street = addressWithoutZip.substring(cityEndIndex).trim();
    } else {
      // Fallback if a clear street part is not found, assume first word is city
      const parts = addressWithoutZip.split(" ");
      city = parts[0] || "";
      street = parts.slice(1).join(" ");
    }
    const billingItems = JSON.parse(billing.items as string);

    const client = new Client({
      key: process.env.SZAMLAZZHU_API_KEY || "",
    });

    const items = billingItems.flatMap((item: any) => {
      const invoiceItems = [];
      const quantity = item.quantity || 1;

      if (item.workTotal > 0) {
        const netUnitPrice = item.workTotal / quantity;
        const netAmount = item.workTotal;
        const taxAmount = netAmount * 0.27;
        invoiceItems.push({
          name: `${item.name} (Munkadíj)`,
          amount: quantity,
          amountName: item.unit,
          netUnitPrice: netUnitPrice,
          netAmount: netAmount,
          taxAmount: taxAmount,
          grossAmount: netAmount + taxAmount,
          vatRate: 27,
        });
      }

      if (item.materialTotal > 0) {
        const netUnitPrice = item.materialTotal / quantity;
        const netAmount = item.materialTotal;
        const taxAmount = netAmount * 0.27;
        invoiceItems.push({
          name: `${item.name} (Anyagköltség)`,
          amount: quantity,
          amountName: item.unit,
          netUnitPrice: netUnitPrice,
          netAmount: netAmount,
          taxAmount: taxAmount,
          grossAmount: netAmount + taxAmount,
          vatRate: 27,
        });
      }

      if (invoiceItems.length === 0) {
        const netUnitPrice = item.unitPrice || 0;
        const netAmount = netUnitPrice * quantity;
        const taxAmount = netAmount * 0.27;
        invoiceItems.push({
          name: item.name,
          amount: quantity,
          amountName: item.unit,
          netUnitPrice: netUnitPrice,
          netAmount: netAmount,
          taxAmount: taxAmount,
          grossAmount: netAmount + taxAmount,
          vatRate: 27,
        });
      }

      return invoiceItems;
    });

    const invoiceData = {
      eInvoice: true,
      currency: Currency.HUF,
      language: Language.HU,
      paymentMethod: PaymentMethod.Transfer,
      settled: false, // Assuming payment is not yet settled
      comment: billing.notes || "",
      sendEmail: false, // Do not send email via szamlazz.hu
      customer: {
        name: customer.customerName,
        email: customer.customerEmail || "",
        address: street,
        city: city,
        zip: zip,
        country: "HU",
        taxNumber: "", // Tax number is not in MyWork
      },
      seller: {
        bank: "Magnet Bank",
        bankAccount: "16200106-11663204-00000000",
      },
    };

    let result;
    try {
      result = await client.generateInvoice(invoiceData, items);
      console.log("Invoice generated successfully:", result);
    } catch (error) {
      console.error("Error generating invoice:", error);
      return { success: false, error: "Failed to generate invoice." };
    }

    const updatedBilling = await prisma.billing.update({
      where: { id: billingId },
      data: {
        invoiceNumber: result.invoice.number,
        invoicePdfUrl: result.invoice.pdfUrl,
        status: "finalized",
      },
    });

    // Update offer items with billed quantities
    const offer = await prisma.offer.findUnique({
      where: { id: billing.offerId },
    });

    if (offer && offer.items) {
      const offerItems = JSON.parse(offer.items as string);
      const updatedOfferItems = offerItems.map((offerItem: any) => {
        // Find matching billing item by name
        const billingItem = billingItems.find(
          (billItem: any) => billItem.name === offerItem.name
        );

        if (billingItem) {
          const currentBilledQuantity = parseFloat(
            offerItem.billedQuantity || "0"
          );
          const newBilledQuantity = parseFloat(billingItem.quantity || "0");

          return {
            ...offerItem,
            billedQuantity: (
              currentBilledQuantity + newBilledQuantity
            ).toString(),
          };
        }

        return offerItem;
      });

      // Update the offer with new billed quantities
      await prisma.offer.update({
        where: { id: billing.offerId },
        data: {
          items: JSON.stringify(updatedOfferItems),
        },
      });
    }

    return {
      success: true,
      updatedBilling: {
        ...updatedBilling,
        items: updatedBilling.items
          ? JSON.parse(updatedBilling.items as string)
          : [],
      },
    };
  } catch (error) {
    console.error("Error finalizing billing:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a számla véglegesítésekor.",
    };
  }
}

export async function updateBilling(
  billingId: number,
  data: { title: string; items: OfferItem[] }
) {
  const { items, title } = data;

  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    if (!items || items.length === 0) {
      throw new Error("Nincsenek tételek a számlához.");
    }

    const existingBilling = await prisma.billing.findFirst({
      where: {
        id: billingId,
        tenantEmail: userEmail,
      },
    });

    if (!existingBilling) {
      throw new Error("Számlatervezet nem található.");
    }

    if (existingBilling.status !== "draft") {
      throw new Error("Csak a piszkozat állapotú számlák módosíthatók.");
    }

    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const updatedBilling = await prisma.billing.update({
      where: {
        id: billingId,
      },
      data: {
        title,
        items: JSON.stringify(items),
        totalPrice,
      },
    });

    revalidatePath(`/billings/drafts/${billingId}`);
    revalidatePath("/billings/my-invoices");

    return {
      success: true,
      billing: updatedBilling,
    };
  } catch (error) {
    console.error("Error updating billing:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a számla frissítésekor.",
    };
  }
}

export async function createBilling(data: CreateBillingData) {
  const { offerId, items, title } = data;

  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

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
      error:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a számla létrehozásakor.",
    };
  }
}
