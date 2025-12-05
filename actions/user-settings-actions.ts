"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";

export async function saveSzamlazzHuApiKey(apiKey: string) {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    if (!apiKey || apiKey.trim() === "") {
      return {
        success: false,
        error: "Az API kulcs nem lehet üres.",
      };
    }

    await prisma.user.update({
      where: { email: tenantEmail },
      data: { szamlazzHuApiKey: apiKey.trim() },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving Számlázz.hu API key:", error);
    return {
      success: false,
      error: "Hiba történt az API kulcs mentésekor.",
    };
  }
}
