/**
 * Integration Tests: client-quote-actions.ts
 * Tests for ensureClientFlag, createClientQuoteSession, getClientQuoteSession
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testPrisma } from "./setup";

// --- Mock Clerk before imports ---
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";
import {
  ensureClientFlag,
  createClientQuoteSession,
  getClientQuoteSession,
} from "@/actions/client-quote-actions";

// -------------------------------------------------------
// Test fixtures
// -------------------------------------------------------
const TEST_CLIENT_EMAIL = "client-test@offerflow-test.com";
const TEST_OTHER_EMAIL = "other-client@offerflow-test.com";

const MOCK_CLERK_USER = {
  id: "clerk-test-client-id",
  fullName: "Test Ügyfél",
  emailAddresses: [{ emailAddress: TEST_CLIENT_EMAIL }],
};

const MOCK_OTHER_CLERK_USER = {
  id: "clerk-other-client-id",
  fullName: "Másik Ügyfél",
  emailAddresses: [{ emailAddress: TEST_OTHER_EMAIL }],
};

// -------------------------------------------------------
// Cleanup helpers
// -------------------------------------------------------
async function cleanupClient() {
  await testPrisma.history.deleteMany({
    where: { userEmail: { in: [TEST_CLIENT_EMAIL, TEST_OTHER_EMAIL] } },
  });
  await testPrisma.user.deleteMany({
    where: { email: { in: [TEST_CLIENT_EMAIL, TEST_OTHER_EMAIL] } },
  });
}

beforeEach(async () => {
  await cleanupClient();
  vi.clearAllMocks();
});

afterEach(async () => {
  await cleanupClient();
});

// -------------------------------------------------------
// ensureClientFlag
// -------------------------------------------------------
describe("ensureClientFlag", () => {
  it("létrehoz új usert isClient=true-val ha még nem létezik", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(user).not.toBeNull();
    expect(user!.isClient).toBe(true);
  });

  it("új usernél isTenant alapértelmezetten false", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(user!.isTenant).toBe(false);
  });

  it("menti a clerkId-t", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(user!.clerkId).toBe(MOCK_CLERK_USER.id);
  });

  it("menti a fullName-t name-ként", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(user!.name).toBe(MOCK_CLERK_USER.fullName);
  });

  it("meglévő usernél isClient=true-ra frissít", async () => {
    await testPrisma.user.create({
      data: {
        clerkId: "old-clerk-id",
        name: "Régi Felhasználó",
        email: TEST_CLIENT_EMAIL,
        isClient: false,
        isTenant: true,
      },
    });

    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(user!.isClient).toBe(true);
  });

  it("meglévő usert nem ír felül teljesen (upsert viselkedés)", async () => {
    await testPrisma.user.create({
      data: {
        clerkId: "existing-clerk-id",
        name: "Meglévő Ügyfél",
        email: TEST_CLIENT_EMAIL,
        isClient: false,
        isTenant: true,
      },
    });

    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();

    const user = await testPrisma.user.findUnique({
      where: { email: TEST_CLIENT_EMAIL },
    });
    // Only isClient should be updated
    expect(user!.isClient).toBe(true);
  });

  it("nem dob hibát ha Clerk user null (nem bejelentkezett)", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await expect(ensureClientFlag()).resolves.not.toThrow();
  });

  it("nem hoz létre usert ha Clerk user null", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await ensureClientFlag();

    const count = await testPrisma.user.count({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(count).toBe(0);
  });

  it("nem dob hibát ha nincs email cím a Clerk useren", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "no-email-clerk-id",
      fullName: "Email Nélkül",
      emailAddresses: [],
    } as any);

    await expect(ensureClientFlag()).resolves.not.toThrow();
  });

  it("idempotens: többször hívva sem dob hibát", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    await ensureClientFlag();
    await ensureClientFlag();
    await ensureClientFlag();

    const count = await testPrisma.user.count({
      where: { email: TEST_CLIENT_EMAIL },
    });
    expect(count).toBe(1);
  });
});

// -------------------------------------------------------
// createClientQuoteSession
// -------------------------------------------------------
describe("createClientQuoteSession", () => {
  it("visszaad { success: true, sessionId } objektumot", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("50m² lakás festése Budapesten");

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe("string");
  });

  it("a sessionId valid UUID formátumú", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Teszt leírás");

    expect(result.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("létrehozza a History rekordot az adatbázisban", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Fürdőszoba felújítás 8m²");

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    expect(session).not.toBeNull();
  });

  it("az első üzenetként elmenti a leírást user role-lal", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const description = "Konyha csempézés 12m²";

    const result = await createClientQuoteSession(description);

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    const content = session!.content as { role: string; content: string }[];
    expect(content).toHaveLength(1);
    expect(content[0].role).toBe("user");
    expect(content[0].content).toBe(description);
  });

  it("aiAgentType = 'client-quote'", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Projekt leírás");

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    expect(session!.aiAgentType).toBe("client-quote");
  });

  it("userEmail = a bejelentkezett felhasználó emailje", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Projekt leírás");

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    expect(session!.userEmail).toBe(TEST_CLIENT_EMAIL);
  });

  it("tenantEmail = a bejelentkezett felhasználó emailje", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Projekt leírás");

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    expect(session!.tenantEmail).toBe(TEST_CLIENT_EMAIL);
  });

  it("createdAt ki van töltve", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await createClientQuoteSession("Projekt leírás");

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    expect(session!.createdAt).toBeDefined();
    expect(session!.createdAt).not.toBeNull();
  });

  it("minden hívás egyedi sessionId-t generál", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const r1 = await createClientQuoteSession("Első projekt");
    const r2 = await createClientQuoteSession("Második projekt");

    expect(r1.sessionId).not.toBe(r2.sessionId);
  });

  it("throws Unauthorized ha Clerk user null", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await expect(
      createClientQuoteSession("Teszt leírás")
    ).rejects.toThrow("Unauthorized");
  });

  it("nem hoz létre DB rekordot ha nincs autentikáció", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    try {
      await createClientQuoteSession("Teszt leírás");
    } catch {}

    const count = await testPrisma.history.count({
      where: { userEmail: TEST_CLIENT_EMAIL, aiAgentType: "client-quote" },
    });
    expect(count).toBe(0);
  });

  it("megőrzi a teljes leírás szöveget (hosszabb szöveg)", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const longDesc = "A".repeat(500) + " - Nagyon részletes projekt leírás";

    const result = await createClientQuoteSession(longDesc);

    const session = await testPrisma.history.findFirst({
      where: { recordId: result.sessionId },
    });
    const content = session!.content as { role: string; content: string }[];
    expect(content[0].content).toBe(longDesc);
  });
});

// -------------------------------------------------------
// getClientQuoteSession
// -------------------------------------------------------
describe("getClientQuoteSession", () => {
  it("visszaadja a sessiont ha létezik és a userhez tartozik", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const created = await createClientQuoteSession("Teszt projekt");

    const session = await getClientQuoteSession(created.sessionId!);

    expect(session).not.toBeNull();
    expect(session!.recordId).toBe(created.sessionId);
  });

  it("null-t ad vissza nem létező sessionId-ra", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    const result = await getClientQuoteSession("non-existent-uuid-9999");

    expect(result).toBeNull();
  });

  it("null-t ad vissza ha a session másik userhez tartozik", async () => {
    // User A létrehozza a sessiont
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const created = await createClientQuoteSession("User A projektje");

    // User B próbálja lekérni
    vi.mocked(currentUser).mockResolvedValue(MOCK_OTHER_CLERK_USER as any);
    const result = await getClientQuoteSession(created.sessionId!);

    expect(result).toBeNull();
  });

  it("csak 'client-quote' típusú sessiont ad vissza", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);

    // Más típusú session direktben
    const otherSession = await testPrisma.history.create({
      data: {
        recordId: "other-type-session-id-12345",
        userEmail: TEST_CLIENT_EMAIL,
        tenantEmail: TEST_CLIENT_EMAIL,
        aiAgentType: "ai-offer",
        content: [{ role: "user", content: "Teszt" }],
        createdAt: new Date().toISOString(),
      },
    });

    const result = await getClientQuoteSession(otherSession.recordId);

    expect(result).toBeNull();
  });

  it("visszaadja a content mezőt (üzenetek listája)", async () => {
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const description = "Visszaadja a tartalmát is";
    const created = await createClientQuoteSession(description);

    const session = await getClientQuoteSession(created.sessionId!);

    const content = session!.content as { role: string; content: string }[];
    expect(content[0].content).toBe(description);
  });

  it("throws Unauthorized ha Clerk user null", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await expect(
      getClientQuoteSession("some-session-id")
    ).rejects.toThrow("Unauthorized");
  });

  it("throws ha nincs email cím", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "no-email-id",
      fullName: "No Email",
      emailAddresses: [],
    } as any);

    await expect(
      getClientQuoteSession("some-session-id")
    ).rejects.toThrow("No email found");
  });

  it("saját sessiont visszaadja, más userét nem – izolációs teszt", async () => {
    // User A session
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    const sessionA = await createClientQuoteSession("User A");

    // User B session
    vi.mocked(currentUser).mockResolvedValue(MOCK_OTHER_CLERK_USER as any);
    const sessionB = await createClientQuoteSession("User B");

    // User A csak saját sessionjét látja
    vi.mocked(currentUser).mockResolvedValue(MOCK_CLERK_USER as any);
    expect(await getClientQuoteSession(sessionA.sessionId!)).not.toBeNull();
    expect(await getClientQuoteSession(sessionB.sessionId!)).toBeNull();

    await testPrisma.history.deleteMany({
      where: { userEmail: TEST_OTHER_EMAIL },
    });
  });
});
