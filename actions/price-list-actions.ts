"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";

/**
 * Globális árak lekérése (csak superUser-ek)
 */
export async function getGlobalPrices() {
  try {
    const { isSuperUser } = await getTenantSafeAuth();

    if (!isSuperUser) {
      return {
        success: false,
        message: "Nincs jogosultsága a globális árak megtekintéséhez",
      };
    }

    const prices = await prisma.priceList.findMany({
      where: { tenantEmail: "" },
      orderBy: { task: "asc" },
    });

    return {
      success: true,
      data: prices,
    };
  } catch (error) {
    console.error("Hiba a globális árak lekérésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a globális árak lekérésekor",
    };
  }
}

/**
 * Tenant árai lekérése
 */
export async function getTenantPrices() {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const prices = await prisma.tenantPriceList.findMany({
      where: { tenantEmail },
      orderBy: { task: "asc" },
    });

    return {
      success: true,
      data: prices,
    };
  } catch (error) {
    console.error("Hiba a tenant árai lekérésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a tenant árai lekérésekor",
    };
  }
}

/**
 * Globális ár frissítése (csak superUser-ek)
 */
export async function updateGlobalPrice(
  id: number,
  data: {
    task?: string;
    category?: string | null;
    technology?: string | null;
    unit?: string | null;
    laborCost?: number;
    materialCost?: number;
  }
) {
  try {
    const { isSuperUser } = await getTenantSafeAuth();

    if (!isSuperUser) {
      return {
        success: false,
        message: "Nincs jogosultsága a globális árak módosításához",
      };
    }

    const updateData: any = {};
    if (data.task !== undefined) updateData.task = data.task;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.technology !== undefined) updateData.technology = data.technology;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.laborCost !== undefined) updateData.laborCost = data.laborCost;
    if (data.materialCost !== undefined)
      updateData.materialCost = data.materialCost;

    const price = await prisma.priceList.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/prices");

    return {
      success: true,
      data: price,
    };
  } catch (error) {
    console.error("Hiba a globális ár frissítésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a globális ár frissítésekor",
    };
  }
}

/**
 * Tenant ár frissítése
 */
export async function updateTenantPrice(
  id: number,
  data: {
    task?: string;
    category?: string | null;
    technology?: string | null;
    unit?: string | null;
    laborCost?: number;
    materialCost?: number;
  }
) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const updateData: any = {};
    if (data.task !== undefined) updateData.task = data.task;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.technology !== undefined) updateData.technology = data.technology;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.laborCost !== undefined) updateData.laborCost = data.laborCost;
    if (data.materialCost !== undefined)
      updateData.materialCost = data.materialCost;

    const price = await prisma.tenantPriceList.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/prices");

    return {
      success: true,
      data: price,
    };
  } catch (error) {
    console.error("Hiba a tenant ár frissítésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a tenant ár frissítésekor",
    };
  }
}

/**
 * Globális ár törlése (csak superUser-ek)
 */
export async function deleteGlobalPrice(id: number) {
  try {
    const { isSuperUser } = await getTenantSafeAuth();

    if (!isSuperUser) {
      return {
        success: false,
        message: "Nincs jogosultsága a globális árak törléséhez",
      };
    }

    await prisma.priceList.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Globális ár sikeresen törölve",
    };
  } catch (error) {
    console.error("Hiba a globális ár törlésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a globális ár törlésekor",
    };
  }
}

/**
 * Tenant ár törlése
 */
export async function deleteTenantPrice(id: number) {
  try {
    await prisma.tenantPriceList.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Tenant ár sikeresen törölve",
    };
  } catch (error) {
    console.error("Hiba a tenant ár törlésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a tenant ár törlésekor",
    };
  }
}
