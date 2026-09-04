import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollApiKey: { findUnique: findUniqueMock, update: updateMock },
  },
}));

import {
  generateApiKey,
  hashApiKey,
  hashesMatch,
  resolveTenantFromApiKey,
} from "../lib/payroll/api-keys";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  updateMock.mockResolvedValue({});
});

describe("generateApiKey", () => {
  it("felismerhető előtaggal ad kulcsot", () => {
    expect(generateApiKey().plaintext.startsWith("ofpay_")).toBe(true);
  });

  it("minden hívásra másikat ad", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().plaintext));
    expect(keys.size).toBe(50);
  });

  it("elég hosszú ahhoz, hogy ne lehessen kitalálni", () => {
    // 32 bájt véletlen base64url-ben ~43 karakter.
    expect(generateApiKey().plaintext.length).toBeGreaterThan(40);
  });

  it("a hash a nyers kulcsból jön, és nem tartalmazza azt", () => {
    const key = generateApiKey();
    expect(key.keyHash).toBe(hashApiKey(key.plaintext));
    expect(key.keyHash).not.toContain(key.plaintext);
    expect(key.keyHash).toHaveLength(64); // SHA-256 hex
  });

  it("a prefix rövid — felismeréshez elég, visszafejtéshez kevés", () => {
    const key = generateApiKey();
    expect(key.keyPrefix.startsWith("ofpay_")).toBe(true);
    expect(key.keyPrefix.length).toBeLessThan(key.plaintext.length / 2);
  });
});

describe("hashesMatch", () => {
  it("azonos hash-re igaz", () => {
    const h = hashApiKey("ofpay_teszt");
    expect(hashesMatch(h, h)).toBe(true);
  });

  it("eltérőre hamis", () => {
    expect(hashesMatch(hashApiKey("ofpay_a"), hashApiKey("ofpay_b"))).toBe(false);
  });

  it("eltérő hosszra nem dob, csak hamisat ad", () => {
    // A timingSafeEqual eltérő hosszra kivételt dobna — ezt elkapjuk.
    expect(hashesMatch("abcd", hashApiKey("ofpay_a"))).toBe(false);
  });
});

describe("resolveTenantFromApiKey", () => {
  const KEY = "ofpay_" + "a".repeat(43);

  it("hiányzó fejlécre null", async () => {
    expect(await resolveTenantFromApiKey(null)).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("nem a mi előtagunkkal kezdődő értéket meg sem keres", async () => {
    // Így egy véletlen Bearer-token nem generál adatbázis-kört.
    expect(await resolveTenantFromApiKey("Bearer eyJhbGciOi...")).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("elfogadja a 'Bearer ' előtagot és a csupasz kulcsot is", async () => {
    findUniqueMock.mockResolvedValue({
      id: "k1",
      tenantEmail: "ceg@pelda.hu",
      keyHash: hashApiKey(KEY),
      revokedAt: null,
    });
    expect(await resolveTenantFromApiKey(`Bearer ${KEY}`)).toBe("ceg@pelda.hu");
    expect(await resolveTenantFromApiKey(KEY)).toBe("ceg@pelda.hu");
  });

  it("ismeretlen kulcsra null", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await resolveTenantFromApiKey(KEY)).toBeNull();
  });

  it("VISSZAVONT kulccsal nem enged be", async () => {
    findUniqueMock.mockResolvedValue({
      id: "k1",
      tenantEmail: "ceg@pelda.hu",
      keyHash: hashApiKey(KEY),
      revokedAt: new Date("2026-01-01"),
    });
    expect(await resolveTenantFromApiKey(KEY)).toBeNull();
  });

  it("a kulcsot a HASH-én keresi, nem nyersen", async () => {
    findUniqueMock.mockResolvedValue(null);
    await resolveTenantFromApiKey(KEY);
    const where = findUniqueMock.mock.calls[0][0].where;
    expect(where.keyHash).toBe(hashApiKey(KEY));
    expect(JSON.stringify(where)).not.toContain(KEY);
  });

  it("sikeres azonosításkor frissíti az utolsó használatot", async () => {
    findUniqueMock.mockResolvedValue({
      id: "k1",
      tenantEmail: "ceg@pelda.hu",
      keyHash: hashApiKey(KEY),
      revokedAt: null,
    });
    await resolveTenantFromApiKey(KEY);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "k1" } }),
    );
  });

  it("az utolsó-használat írásának hibája nem akadályozza a hozzáférést", async () => {
    findUniqueMock.mockResolvedValue({
      id: "k1",
      tenantEmail: "ceg@pelda.hu",
      keyHash: hashApiKey(KEY),
      revokedAt: null,
    });
    updateMock.mockRejectedValue(new Error("db down"));
    // A könyvelő lekérése nem bukhat el egy statisztika-mező miatt.
    expect(await resolveTenantFromApiKey(KEY)).toBe("ceg@pelda.hu");
  });
});
