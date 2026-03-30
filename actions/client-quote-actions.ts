"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

/**
 * Beállítja az isClient=true flaget az aktuális useren.
 * Ha még nincs DB rekordja, létrehozza.
 * Tenant, worker, bárki lehet kliens is egyszerre.
 */
export async function ensureClientFlag() {
  const user = await currentUser();
  if (!user) return;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return;

  await prisma.user.upsert({
    where: { email },
    update: { isClient: true },
    create: {
      clerkId: user.id,
      name: user.fullName ?? "",
      email,
      isClient: true,
      isTenant: false, // Ügyfélként regisztráló → alapból nem tenant
    },
  });
}

/**
 * Új kliens ajánlatkérő session létrehozása.
 */
export async function createClientQuoteSession(initialDescription: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email found");

  const sessionId = uuidv4();

  await prisma.history.create({
    data: {
      recordId: sessionId,
      userEmail: email,
      tenantEmail: email,
      content: [{ role: "user", content: initialDescription }],
      aiAgentType: "client-quote",
      createdAt: new Date().toISOString(),
    },
  });

  await logQuoteEvent(sessionId, email, "session_created", { hasFile: false });

  return { success: true, sessionId };
}

/**
 * Kliens session lekérése sessionId + email alapján.
 */
export async function getClientQuoteSession(sessionId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email found");

  const session = await prisma.history.findFirst({
    where: {
      recordId: sessionId,
      userEmail: email,
      aiAgentType: "client-quote",
    },
  });

  return session;
}

// ─── Audit Log ───────────────────────────────────────────────

export async function logQuoteEvent(
  sessionId: string,
  userEmail: string,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.quoteAuditLog.create({
      data: { sessionId, userEmail, action, details: details ? JSON.parse(JSON.stringify(details)) : undefined },
    });
  } catch (e) {
    console.error("AuditLog write failed:", e);
  }
}

// ─── GDPR: Adattörlés ───────────────────────────────────────

export async function deleteClientQuoteData(sessionId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email found");

  const session = await prisma.history.findFirst({
    where: { recordId: sessionId, userEmail: email, aiAgentType: "client-quote" },
  });
  if (!session) throw new Error("Session not found");

  await prisma.history.delete({ where: { id: session.id } });

  await logQuoteEvent(sessionId, email, "data_deleted");

  return { success: true };
}

// ─── GDPR: Adatexport ───────────────────────────────────────

export async function exportClientQuoteData(sessionId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("No email found");

  const session = await prisma.history.findFirst({
    where: { recordId: sessionId, userEmail: email, aiAgentType: "client-quote" },
  });
  if (!session) throw new Error("Session not found");

  const auditLogs = await prisma.quoteAuditLog.findMany({
    where: { sessionId, userEmail: email },
    orderBy: { createdAt: "asc" },
  });

  await logQuoteEvent(sessionId, email, "data_exported");

  return {
    session: {
      id: session.recordId,
      content: session.content,
      createdAt: session.createdAt,
      fileName: session.fileName,
    },
    auditLog: auditLogs.map((l) => ({
      action: l.action,
      details: l.details,
      createdAt: l.createdAt,
    })),
  };
}
