"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

/**
 * Meghívó link generálása (csak superUser-eknek)
 */
export async function generateInviteLink() {
  try {
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return { success: false, error: "Nincs bejelentkezve" };
    }

    const email = user.emailAddresses[0].emailAddress;

    // Ellenőrizzük, hogy superUser-e
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { isSuperUser: true },
    });

    if (!dbUser?.isSuperUser) {
      return {
        success: false,
        error: "Nincs jogosultság meghívó link létrehozásához",
      };
    }

    // Egyedi token generálása
    const token = nanoid(32);

    // Token mentése az adatbázisba
    await prisma.inviteToken.create({
      data: {
        token,
        createdBy: email,
        isActive: true,
      },
    });

    // Meghívó link összeállítása
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return { success: true, inviteUrl };
  } catch (error) {
    console.error("Error generating invite link:", error);
    return {
      success: false,
      error: "Hiba történt a meghívó link generálása során",
    };
  }
}

/**
 * Meghívó token validálása
 */
export async function validateInviteToken(token: string) {
  try {
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken) {
      return { valid: false, error: "Érvénytelen meghívó link" };
    }

    if (!inviteToken.isActive) {
      return { valid: false, error: "Ez a meghívó link már nem aktív" };
    }

    if (inviteToken.usedBy) {
      return {
        valid: false,
        error: "Ez a meghívó link már fel lett használva",
      };
    }

    if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
      return { valid: false, error: "Ez a meghívó link lejárt" };
    }

    return { valid: true, createdBy: inviteToken.createdBy };
  } catch (error) {
    console.error("Error validating invite token:", error);
    return {
      valid: false,
      error: "Hiba történt a meghívó link ellenőrzése során",
    };
  }
}

/**
 * Meghívó token felhasználása (regisztráció után)
 */
export async function useInviteToken(token: string, userEmail: string) {
  try {
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken || !inviteToken.isActive || inviteToken.usedBy) {
      return { success: false, error: "Érvénytelen meghívó link" };
    }

    // 14 napos trial beállítása
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // User létrehozása vagy frissítése (upsert)
    await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        invitedBy: inviteToken.createdBy,
        trialEndsAt,
      },
      create: {
        email: userEmail,
        name: userEmail.split('@')[0], // Email első része mint név
        invitedBy: inviteToken.createdBy,
        trialEndsAt,
        isTenant: true, // Default érték
      },
    });

    // Token felhasználásának jelölése
    await prisma.inviteToken.update({
      where: { token },
      data: {
        usedBy: userEmail,
        usedAt: new Date(),
        isActive: false,
      },
    });

    return { success: true, trialEndsAt };
  } catch (error) {
    console.error("Error using invite token:", error);
    return {
      success: false,
      error: "Hiba történt a meghívó felhasználása során",
    };
  }
}

/**
 * Ellenőrzi, hogy a user-nek van-e aktív trial vagy subscription
 */
export async function checkUserAccess(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      return { hasAccess: false, reason: "user_not_found" };
    }

    // SuperUser mindig hozzáfér
    if (user.isSuperUser) {
      return { hasAccess: true, reason: "super_user" };
    }

    // Aktív subscription ellenőrzése
    if (user.subscription && user.subscription.status === "active") {
      return { hasAccess: true, reason: "active_subscription" };
    }

    // Trial ellenőrzése
    if (user.trialEndsAt && user.trialEndsAt > new Date()) {
      return {
        hasAccess: true,
        reason: "trial",
        trialEndsAt: user.trialEndsAt,
      };
    }

    return { hasAccess: false, reason: "no_access" };
  } catch (error) {
    console.error("Error checking user access:", error);
    return { hasAccess: false, reason: "error" };
  }
}
