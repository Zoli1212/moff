"use server";

import { prisma } from "@/lib/prisma";
import * as tenantAuth from "@/lib/tenant-auth";

export async function updateExpectedProfitPercent(
  workId: number,
  expectedProfitPercent: number
) {
  try {
    const { tenantEmail } = await tenantAuth.getTenantSafeAuth();
    
    if (!tenantEmail) {
      throw new Error("Nincs jogosultság");
    }

    // Ellenőrizzük, hogy a munka létezik-e és a tenant-hez tartozik-e
    const work = await prisma.work.findFirst({
      where: {
        id: workId,
        tenantEmail: tenantEmail,
      },
    });

    if (!work) {
      throw new Error("A munka nem található vagy nincs jogosultság");
    }

    // Ellenőrizzük, hogy van-e már Performance rekord ehhez a munkához
    let performance = await prisma.performance.findFirst({
      where: {
        workId: workId,
        tenantEmail: tenantEmail,
      },
    });

    if (performance) {
      // Frissítjük a meglévő rekordot
      performance = await prisma.performance.update({
        where: {
          id: performance.id,
        },
        data: {
          expectedProfitPercent: expectedProfitPercent,
          updatedAt: new Date(),
        },
      });
    } else {
      // Új Performance rekordot hozunk létre
      // A kötelező mezőket alapértelmezett értékekkel töltjük fel
      performance = await prisma.performance.create({
        data: {
          workId: workId,
          tenantEmail: tenantEmail,
          expectedProfitPercent: expectedProfitPercent,
          // Kötelező mezők alapértelmezett értékekkel
          offerPrice: 0, // Ezt később frissíteni kell az ajánlat alapján
          ownCosts: 0,   // Ezt később frissíteni kell a tényleges költségek alapján
          title: `Teljesítmény - ${work.title}`,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      performance,
      message: "Elvárt profit százalék sikeresen mentve",
    };
  } catch (error) {
    console.error("Hiba az elvárt profit százalék mentésekor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ismeretlen hiba",
    };
  }
}

export async function getExpectedProfitPercent(workId: number) {
  try {
    const { tenantEmail } = await tenantAuth.getTenantSafeAuth();
    
    if (!tenantEmail) {
      throw new Error("Nincs jogosultság");
    }

    const performance = await prisma.performance.findFirst({
      where: {
        workId: workId,
        tenantEmail: tenantEmail,
      },
      select: {
        expectedProfitPercent: true,
        id: true,
      },
    });

    return {
      success: true,
      expectedProfitPercent: performance?.expectedProfitPercent || null,
      hasPerformance: !!performance,
    };
  } catch (error) {
    console.error("Hiba az elvárt profit százalék lekérésekor:", error);
    return {
      success: false,
      expectedProfitPercent: null,
      hasPerformance: false,
      error: error instanceof Error ? error.message : "Ismeretlen hiba",
    };
  }
}
