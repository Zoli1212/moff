"use server";

/**
 * A lekérő API kulcsainak kezelése.
 *
 * A kulcs nyers értéke EGYSZER, a létrehozás válaszában létezik — utána már
 * csak a hash-e van meg, ahogy egy jelszónál. Aki elveszti, újat kér; a
 * régit visszavonja.
 *
 * A "use server" modulból csak async függvény exportálható, ezért a
 * kulcsgenerálás és a hash a lib/payroll/api-keys.ts-ben él.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { generateApiKey } from "@/lib/payroll/api-keys";

export interface PayrollApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listPayrollApiKeys(): Promise<{
  success: boolean;
  keys?: PayrollApiKeyView[];
  error?: string;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    const rows = await prisma.payrollApiKey.findMany({
      where: { tenantEmail, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return {
      success: true,
      keys: rows.map((row) => ({
        id: row.id,
        name: row.name,
        keyPrefix: row.keyPrefix,
        createdAt: row.createdAt.toISOString(),
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      })),
    };
  } catch (error) {
    console.error("[payroll-api-key] list failed:", error);
    return { success: false, error: "A kulcsok betöltése nem sikerült." };
  }
}

export async function createPayrollApiKey(name: string): Promise<{
  success: boolean;
  /** A nyers kulcs — a hívónak MOST kell elmentenie, később nem kérhető le. */
  plaintext?: string;
  error?: string;
}> {
  try {
    const { tenantEmail, originalUserEmail } = await getTenantSafeAuth();
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Adj nevet a kulcsnak." };

    const key = generateApiKey();
    await prisma.payrollApiKey.create({
      data: {
        tenantEmail,
        keyHash: key.keyHash,
        keyPrefix: key.keyPrefix,
        name: trimmed,
        createdBy: originalUserEmail,
      },
    });

    revalidatePath("/billings/payroll");
    return { success: true, plaintext: key.plaintext };
  } catch (error) {
    console.error("[payroll-api-key] create failed:", error);
    return { success: false, error: "A kulcs létrehozása nem sikerült." };
  }
}

export async function revokePayrollApiKey(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    // A bérlő-szűrés a WHERE-ben van: idegen kulcsot nem lehet visszavonni
    // akkor sem, ha valaki kitalálja az azonosítót.
    const result = await prisma.payrollApiKey.updateMany({
      where: { id, tenantEmail, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      return { success: false, error: "A kulcs nem található." };
    }
    revalidatePath("/billings/payroll");
    return { success: true };
  } catch (error) {
    console.error("[payroll-api-key] revoke failed:", error);
    return { success: false, error: "A visszavonás nem sikerült." };
  }
}
