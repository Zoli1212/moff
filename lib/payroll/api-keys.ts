/**
 * A lekérő API kulcsai.
 *
 * A kulcs úgy viselkedik, mint egy jelszó: nyersen csak egyszer, a
 * létrehozás pillanatában látható, utána már csak a hash-e van meg. Így egy
 * adatbázis-kiszivárgás önmagában nem ad hozzáférést senki bérszámfejtési
 * adatához.
 *
 * A `crypto` a Node beépített modulja — nem függ külső csomagtól, és a
 * route-ban (Node runtime) elérhető.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Felismerhető előtag, hogy egy kiszivárgott kulcs azonosítható legyen. */
const KEY_PREFIX = "ofpay_";

export interface GeneratedApiKey {
  /** A nyers kulcs — EZ AZ EGYETLEN alkalom, amikor létezik olvasható formában. */
  plaintext: string;
  keyHash: string;
  keyPrefix: string;
}

/** Új kulcs: 32 bájt véletlen, base64url-ben. */
export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    keyHash: hashApiKey(plaintext),
    // Elég a felismeréshez, kevés a visszafejtéshez.
    keyPrefix: plaintext.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/**
 * Két hash összevetése időzítés-független módon.
 *
 * A `===` a különbség helyétől függően más ideig fut, amiből egy támadó
 * karakterenként ki tudná következtetni a helyes értéket.
 */
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * A kéréshez tartozó bérlő, vagy `null`, ha a kulcs hiányzik / visszavont /
 * ismeretlen. A hívó ebből 401-et ad — sose közöljük, MELYIK ok állt fenn.
 */
export async function resolveTenantFromApiKey(
  headerValue: string | null,
): Promise<string | null> {
  if (!headerValue) return null;
  // "Bearer ofpay_…" és a csupasz kulcs is elfogadott — a könyvelő
  // rendszerének kliense bármelyiket küldheti.
  const raw = headerValue.replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(raw);
  const record = await prisma.payrollApiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, tenantEmail: true, keyHash: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;
  if (!hashesMatch(record.keyHash, hash)) return null;

  // Utolsó használat — a koordinátor lássa, él-e még az integráció.
  // Hibája nem akadályozhatja meg a válasz kiszolgálását.
  void prisma.payrollApiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch((error) => console.error("[payroll-api] lastUsedAt update failed:", error));

  return record.tenantEmail;
}
