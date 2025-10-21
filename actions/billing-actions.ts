"use server";

import { prisma } from "@/lib/prisma";
import { Client, Currency, Language, PaymentMethod } from "@/lib/szamlazz";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import { recalculateWorkTotals } from "./work-actions";

interface BillingItem {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  materialUnitPrice?: number;
  materialTotal?: number;
  workTotal?: number;
  totalPrice: number;
  description?: string;
}

interface CreateBillingData {
  title: string;
  workId?: number;
  offerId?: number;
  items: BillingItem[];
}

export async function getBillings() {
  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    const billings = await prisma.billing.findMany({
      where: {
        tenantEmail: userEmail,
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
          },
        },
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

    // Type-safe access to new customer fields (may not exist yet in Prisma types)
    const billingAny = billing as any;
    const customerName = billingAny.customerName || customer.customerName;
    const city = billingAny.customerCity || "Budapest";
    const street = billingAny.customerAddress || "";
    const zip = billingAny.customerZip || "";
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
        name: customerName,
        email: customer.customerEmail || "",
        address: street,
        city: city,
        zip: zip,
        country: "HU",
        taxNumber: billing.taxNumber || "", // Use tax number from billing
        euTaxNumber: billing.euTaxNumber || "", // Use EU tax number from billing
      },
      seller: {
        bank: "Magnet Bank",
        bankAccount: "16200106-11663204-00000000",
      },
    };

    console.log("📤 [szamlazz.hu] Sending invoice data:", JSON.stringify({
      invoiceData,
      items,
      customerName,
      city,
      street,
      zip
    }, null, 2));

    let result;
    try {
      result = await client.generateInvoice(invoiceData, items);
      console.log("✅ [szamlazz.hu] Invoice generated successfully:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("❌ [szamlazz.hu] Error generating invoice:", error);
      console.error("❌ [szamlazz.hu] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: `Failed to generate invoice: ${error}` };
    }

    const updatedBilling = await prisma.billing.update({
      where: { id: billingId },
      data: {
        invoiceNumber: result.invoice.number,
        invoicePdfUrl: result.invoice.pdfUrl,
        status: "finalized",
      },
    });

    // Update work items with billed quantities - DIRECTLY by workItemId
    console.log(
      "🔍 [finalizeAndGenerateInvoice] Updating WorkItems directly by workItemId"
    );
    console.log("🔍 [finalizeAndGenerateInvoice] BillingItems:", billingItems);

    let workIdToRecalculate: number | null = null;

    for (const billingItem of billingItems) {
      if (billingItem.workItemId) {
        const newBilledQuantity = parseFloat(billingItem.quantity || "0");

        // Get current billedQuantity and workId
        const currentWorkItem = await prisma.workItem.findUnique({
          where: { id: billingItem.workItemId },
          select: { billedQuantity: true, name: true, workId: true },
        });

        if (currentWorkItem) {
          const currentBilledQuantity = currentWorkItem.billedQuantity || 0;
          const updatedBilledQuantity =
            currentBilledQuantity + newBilledQuantity;

          console.log(
            `✅ [finalizeAndGenerateInvoice] Updating WorkItem ${billingItem.workItemId} (${currentWorkItem.name}): ${currentBilledQuantity} + ${newBilledQuantity} = ${updatedBilledQuantity}`
          );

          await prisma.workItem.update({
            where: { id: billingItem.workItemId },
            data: {
              billedQuantity: updatedBilledQuantity,
            },
          });

          // Megjegyezzük a workId-t a későbbi újraszámításhoz
          if (!workIdToRecalculate) {
            workIdToRecalculate = currentWorkItem.workId;
          }
        } else {
          console.log(
            `❌ [finalizeAndGenerateInvoice] WorkItem not found: ${billingItem.workItemId}`
          );
        }
      } else {
        console.log(
          `⚠️ [finalizeAndGenerateInvoice] No workItemId in billingItem:`,
          billingItem
        );
      }
    }

    // Frissítjük a Work aggregált értékeit, ha volt workItem frissítés
    if (workIdToRecalculate) {
      await recalculateWorkTotals(workIdToRecalculate, tenantEmail);
      console.log(`✅ [finalizeAndGenerateInvoice] Work #${workIdToRecalculate} totals recalculated`);
    }

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
  data: { 
    title: string; 
    items: BillingItem[]; 
    taxNumber?: string | null; 
    euTaxNumber?: string | null; 
    customerName?: string | null;
    customerCity?: string | null;
    customerAddress?: string | null;
    customerZip?: string | null;
  }
) {
  const { items, title, taxNumber, euTaxNumber, customerName, customerCity, customerAddress, customerZip } = data;

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
        taxNumber,
        euTaxNumber,
        customerName: customerName as any,
        customerCity: customerCity as any,
        customerAddress: customerAddress as any,
        customerZip: customerZip as any,
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

export async function markAsPaidCash(billingId: number) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    const billing = await prisma.billing.findFirst({
      where: {
        id: billingId,
        tenantEmail: tenantEmail,
      },
    });

    if (!billing) {
      throw new Error("Számla nem található.");
    }

    if (billing.status !== "draft") {
      throw new Error("Csak piszkozat állapotú számlák jelölhetők pénzügyileg teljesítettnek.");
    }

    const billingItems = JSON.parse(billing.items as string);

    // Update work items with paid quantities - DIRECTLY by workItemId
    console.log(
      "🔍 [markAsPaidCash] Updating WorkItems paidQuantity by workItemId"
    );
    console.log("🔍 [markAsPaidCash] BillingItems:", billingItems);

    for (const billingItem of billingItems) {
      if (billingItem.workItemId) {
        const newPaidQuantity = parseFloat(billingItem.quantity || "0");

        // Get current paidQuantity
        const currentWorkItem = await prisma.workItem.findUnique({
          where: { id: billingItem.workItemId },
          select: { paidQuantity: true, name: true },
        });

        if (currentWorkItem) {
          const currentPaidQuantity = currentWorkItem.paidQuantity || 0;
          const updatedPaidQuantity = currentPaidQuantity + newPaidQuantity;

          console.log(
            `✅ [markAsPaidCash] Updating WorkItem ${billingItem.workItemId} (${currentWorkItem.name}): ${currentPaidQuantity} + ${newPaidQuantity} = ${updatedPaidQuantity}`
          );

          await prisma.workItem.update({
            where: { id: billingItem.workItemId },
            data: {
              paidQuantity: updatedPaidQuantity,
            },
          });
        } else {
          console.log(
            `❌ [markAsPaidCash] WorkItem not found: ${billingItem.workItemId}`
          );
        }
      } else {
        console.log(
          `⚠️ [markAsPaidCash] No workItemId in billingItem:`,
          billingItem
        );
      }
    }

    // Update billing status to indicate cash payment
    const updatedBilling = await prisma.billing.update({
      where: { id: billingId },
      data: {
        status: "paid_cash",
        notes: (billing.notes || "") + " [Készpénzben fizetve]",
      },
    });

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
    console.error("Error marking as paid cash:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a készpénzes fizetés jelölésekor.",
    };
  }
}

export async function createBilling(data: CreateBillingData) {
  const { offerId, workId, items, title } = data;

  try {
    const { user, tenantEmail: userEmail } = await getTenantSafeAuth();

    if (!items || items.length === 0) {
      throw new Error("Nincsenek tételek a számlához.");
    }

    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Get the correct offerId from the work
    let correctOfferId = offerId;
    if (!correctOfferId && workId) {
      const work = await prisma.work.findUnique({
        where: { id: workId },
        select: { offerId: true },
      });
      correctOfferId = work?.offerId || 1;
    }

    const billing = await prisma.billing.create({
      data: {
        title,
        offerId: correctOfferId || 1,
        workId: workId || null, // Kapcsolat a munkához
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
