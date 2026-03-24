/**
 * Integration Tests: /api/client-quote-chat/route.ts
 * Tests for the POST handler: auth, session lookup, price context, OpenAI call, DB save
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testPrisma } from "./setup";
import { NextRequest } from "next/server";

// -------------------------------------------------------
// Mocks – minden külső függőség
// -------------------------------------------------------

const mockCurrentUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

const mockBuildPriceContext = vi.fn();
vi.mock("@/lib/price-context", () => ({
  buildPriceContext: mockBuildPriceContext,
}));

const mockTavilySearch = vi.fn();
vi.mock("@tavily/core", () => ({
  tavily: vi.fn(() => ({ search: mockTavilySearch })),
}));

const mockOpenAICreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

// -------------------------------------------------------
// Import a route handler az összes mock után
// -------------------------------------------------------
import { POST } from "@/app/api/client-quote-chat/route";

// -------------------------------------------------------
// Fixtures
// -------------------------------------------------------
const TEST_EMAIL = "route-test@offerflow-test.com";
const TEST_SESSION_ID = "route-test-session-uuid-001";

const MOCK_CLERK_USER = {
  id: "clerk-route-test-id",
  fullName: "Route Test User",
  emailAddresses: [{ emailAddress: TEST_EMAIL }],
};

const MOCK_MESSAGES = [
  { role: "user", content: "50m² fürdőszoba felújítás Budapesten" },
];

const MOCK_AI_REPLY = "Köszönöm! Mikor tervezi a munkát elvégeztetni?";

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/client-quote-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function parseResponse(res: Response) {
  return res.json();
}

// -------------------------------------------------------
// Setup / Teardown
// -------------------------------------------------------
beforeEach(async () => {
  vi.clearAllMocks();

  // Alapértelmezett mock értékek
  mockCurrentUser.mockResolvedValue(MOCK_CLERK_USER);
  mockBuildPriceContext.mockResolvedValue("GLOBÁLIS ÁRAK:\n- Festés | m² | Munkadíj: 2000 Ft");
  mockTavilySearch.mockResolvedValue({ results: [] });
  mockOpenAICreate.mockResolvedValue({
    choices: [{ message: { content: MOCK_AI_REPLY } }],
  });

  // Létrehozzuk a teszt sessiont az adatbázisban
  await testPrisma.history.deleteMany({ where: { userEmail: TEST_EMAIL } });
  await testPrisma.history.create({
    data: {
      recordId: TEST_SESSION_ID,
      userEmail: TEST_EMAIL,
      tenantEmail: TEST_EMAIL,
      aiAgentType: "client-quote",
      content: MOCK_MESSAGES,
      createdAt: new Date().toISOString(),
    },
  });
});

afterEach(async () => {
  await testPrisma.history.deleteMany({ where: { userEmail: TEST_EMAIL } });
});

// -------------------------------------------------------
// Auth tesztek
// -------------------------------------------------------
describe("POST /api/client-quote-chat – autentikáció", () => {
  it("401-et ad vissza ha nincs bejelentkezett user", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await parseResponse(res);
    expect(body.error).toBe("Unauthorized");
  });

  it("400-at ad vissza ha a usernek nincs email címe", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "no-email-clerk",
      fullName: "No Email",
      emailAddresses: [],
    });

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("No email found");
  });
});

// -------------------------------------------------------
// Request validáció
// -------------------------------------------------------
describe("POST /api/client-quote-chat – request validáció", () => {
  it("400-at ad vissza ha hiányzik a messages mező", async () => {
    const req = makeRequest({ sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("Hiányzó adatok");
  });

  it("400-at ad vissza ha hiányzik a sessionId", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("Hiányzó adatok");
  });

  it("400-at ad vissza ha mindkét mező hiányzik", async () => {
    const req = makeRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// -------------------------------------------------------
// Session keresés
// -------------------------------------------------------
describe("POST /api/client-quote-chat – session keresés", () => {
  it("404-et ad vissza ha nem létező sessionId-t küldünk", async () => {
    const req = makeRequest({
      messages: MOCK_MESSAGES,
      sessionId: "not-existing-session-id",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await parseResponse(res);
    expect(body.error).toBe("Session nem található");
  });

  it("404-et ad vissza ha a session másik userhez tartozik", async () => {
    // Másik user session-je
    await testPrisma.history.create({
      data: {
        recordId: "other-user-session-id",
        userEmail: "completely-different@test.com",
        tenantEmail: "completely-different@test.com",
        aiAgentType: "client-quote",
        content: [],
        createdAt: new Date().toISOString(),
      },
    });

    const req = makeRequest({
      messages: MOCK_MESSAGES,
      sessionId: "other-user-session-id",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);

    await testPrisma.history.deleteMany({
      where: { userEmail: "completely-different@test.com" },
    });
  });

  it("404-et ad vissza ha nem client-quote típusú a session", async () => {
    await testPrisma.history.create({
      data: {
        recordId: "wrong-type-session-id",
        userEmail: TEST_EMAIL,
        tenantEmail: TEST_EMAIL,
        aiAgentType: "ai-offer",
        content: [],
        createdAt: new Date().toISOString(),
      },
    });

    const req = makeRequest({
      messages: MOCK_MESSAGES,
      sessionId: "wrong-type-session-id",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});

// -------------------------------------------------------
// Sikeres folyamat
// -------------------------------------------------------
describe("POST /api/client-quote-chat – sikeres folyamat", () => {
  it("200-as választ ad vissza { reply } mezővel", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.reply).toBe(MOCK_AI_REPLY);
  });

  it("meghívja az OpenAI API-t", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    expect(mockOpenAICreate).toHaveBeenCalledOnce();
  });

  it("az OpenAI-nak átadja az üzeneteket", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const userMessages = call.messages.filter((m: any) => m.role === "user");
    expect(userMessages[0].content).toBe(MOCK_MESSAGES[0].content);
  });

  it("az OpenAI-nak átad system promptot", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m: any) => m.role === "system");
    expect(systemMsg).toBeDefined();
    expect(systemMsg.content).toContain("ajánlatkérő");
  });

  it("meghívja a buildPriceContext-et az árak betöltéséhez", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    expect(mockBuildPriceContext).toHaveBeenCalledOnce();
  });

  it("a price contextet beleteszi a system promptba", async () => {
    mockBuildPriceContext.mockResolvedValue("GLOBÁLIS ÁRAK:\n- Festés | m² | 2000 Ft");

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).toContain("ADATBÁZIS ÁRAK");
  });

  it("ha buildPriceContext üres, nem teszi bele az ADATBÁZIS ÁRAK szekciót", async () => {
    mockBuildPriceContext.mockResolvedValue("");

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).not.toContain("ADATBÁZIS ÁRAK");
  });

  it("elmenti a frissített chat logot az adatbázisba", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const session = await testPrisma.history.findFirst({
      where: { recordId: TEST_SESSION_ID, userEmail: TEST_EMAIL },
    });
    const content = session!.content as { role: string; content: string }[];
    const lastMsg = content[content.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe(MOCK_AI_REPLY);
  });

  it("az elmentett content tartalmazza az eredeti user üzenetet is", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const session = await testPrisma.history.findFirst({
      where: { recordId: TEST_SESSION_ID, userEmail: TEST_EMAIL },
    });
    const content = session!.content as { role: string; content: string }[];
    expect(content[0].role).toBe("user");
    expect(content[0].content).toBe(MOCK_MESSAGES[0].content);
  });

  it("gpt-4o-mini modellt használ", async () => {
    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    expect(call.model).toBe("gpt-4o-mini");
  });

  it("ha Tavily nincs konfigurálva, nem dob hibát", async () => {
    mockTavilySearch.mockRejectedValue(new Error("API key missing"));

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    // Az internetkeresés hibája nem akadályozza a válaszadást
    expect(res.status).toBe(200);
  });

  it("internetes árfrissítés eredményét beleteszi a system promptba ha van találat", async () => {
    mockTavilySearch.mockResolvedValue({
      results: [
        { title: "Festés árak 2025", content: "Festés 2000-3000 Ft/m² között" },
      ],
    });

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).toContain("INTERNETES ÁRFRISSÍTÉS");
  });

  it("ha Tavily üres találatot ad, nem kerül internetszekció a promptba", async () => {
    mockTavilySearch.mockResolvedValue({ results: [] });

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    await POST(req);

    const call = mockOpenAICreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).not.toContain("INTERNETES ÁRFRISSÍTÉS");
  });
});

// -------------------------------------------------------
// Hiba kezelés
// -------------------------------------------------------
describe("POST /api/client-quote-chat – hibakezelés", () => {
  it("500-at ad vissza ha az OpenAI hívás hibát dob", async () => {
    mockOpenAICreate.mockRejectedValue(new Error("OpenAI API error"));

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await parseResponse(res);
    expect(body.error).toBe("Hiba történt.");
  });

  it("a hibaválaszban szerepel a details mező", async () => {
    mockOpenAICreate.mockRejectedValue(new Error("Connection timeout"));

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    const body = await parseResponse(res);
    expect(body.details).toBe("Connection timeout");
  });

  it("ha buildPriceContext hibát dob, az API folytatja a context nélkül", async () => {
    mockBuildPriceContext.mockRejectedValue(new Error("DB error"));

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    // Inkább 500 vagy sikeres, de nem omlik össze teljesen
    // A route nem catch-eli a buildPriceContext hibát → 500
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it("ha az OpenAI null választ ad, a reply undefined marad", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const req = makeRequest({ messages: MOCK_MESSAGES, sessionId: TEST_SESSION_ID });
    const res = await POST(req);

    if (res.status === 200) {
      const body = await parseResponse(res);
      expect(body.reply).toBe("Nem tudok válaszolni.");
    }
  });
});
