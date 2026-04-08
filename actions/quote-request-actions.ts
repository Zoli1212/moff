"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Find relevant contractors (tenants) based on work type categories.
 * Matches against TenantPriceList categories.
 */
async function findRelevantContractors(workTypes: string[]): Promise<string[]> {
  if (!workTypes.length) return [];

  const tenants = await prisma.tenantPriceList.findMany({
    where: {
      category: { in: workTypes },
    },
    select: { tenantEmail: true },
    distinct: ["tenantEmail"],
  });

  return tenants.map((t) => t.tenantEmail).filter(Boolean);
}

/**
 * Check if a contractor email exists as a registered user (tenant) in the system.
 */
async function isRegisteredTenant(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { isTenant: true },
  });
  return !!user?.isTenant;
}

/**
 * Send quote request to contractors — email + in-app notification if registered.
 */
/**
 * Send quote request to a specific email address.
 * If the recipient is a registered tenant, they also get an in-app notification.
 */
export async function sendQuoteRequest(
  sessionId: string,
  recipientEmail: string,
  clientName: string,
  estimate: string,
  workTypes: string[]
) {
  let sentCount = 0;
  let notifiedCount = 0;

  // 1. Always send email via Resend
  try {
    await resend.emails.send({
      from: "OfferFlow <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Új ajánlatkérés — ${workTypes.join(", ")}`,
      html: buildQuoteRequestEmail(clientName, estimate, workTypes, sessionId),
    });
    sentCount++;
  } catch (e) {
    console.error(`[quote-request] Email send failed to ${recipientEmail}:`, e);
    return {
      success: false,
      message: "Nem sikerült elküldeni az emailt. Kérjük próbálja újra.",
      sentCount: 0,
    };
  }

  // 2. If recipient is a registered tenant, also create in-app notification
  const isRegistered = await isRegisteredTenant(recipientEmail);
  if (isRegistered) {
    try {
      await prisma.notification.create({
        data: {
          recipientEmail,
          type: "quote_request",
          title: "Új ajánlatkérés érkezett",
          body: `${clientName} ajánlatot kér: ${workTypes.join(", ")}`,
          sessionId,
        },
      });
      notifiedCount++;
    } catch (e) {
      console.error(`[quote-request] Notification create failed for ${recipientEmail}:`, e);
    }
  }

  // Audit log
  await prisma.quoteAuditLog.create({
    data: {
      sessionId,
      userEmail: recipientEmail,
      action: "quote_request_sent",
      details: JSON.parse(JSON.stringify({
        recipientEmail,
        emailsSent: sentCount,
        notificationsSent: notifiedCount,
        isRegisteredTenant: notifiedCount > 0,
        workTypes,
      })),
    },
  }).catch((e) => console.error("[audit] quote_request_sent log failed:", e));

  return {
    success: true,
    message: `Ajánlatkérést elküldtük a kivitelezőnek.`,
    sentCount,
    notifiedCount,
  };
}

/**
 * Notify ALL registered contractors (tenants) in the system.
 * Every tenant gets an email + in-app notification.
 */
export async function notifyAllContractors(
  sessionId: string,
  clientName: string,
  estimate: string,
  workTypes: string[]
) {
  // Get all tenant emails
  const tenants = await prisma.user.findMany({
    where: { isTenant: true },
    select: { email: true },
  });

  if (tenants.length === 0) {
    return {
      success: false,
      message: "Jelenleg nincs regisztrált kivitelező a rendszerben.",
      sentCount: 0,
      notifiedCount: 0,
    };
  }

  let sentCount = 0;
  let notifiedCount = 0;

  for (const tenant of tenants) {
    // Email
    try {
      await resend.emails.send({
        from: "OfferFlow <onboarding@resend.dev>",
        to: [tenant.email],
        subject: `Új ajánlatkérés — ${workTypes.join(", ")}`,
        html: buildQuoteRequestEmail(clientName, estimate, workTypes, sessionId),
      });
      sentCount++;
    } catch (e) {
      console.error(`[notify-all] Email failed to ${tenant.email}:`, e);
    }

    // Notification
    try {
      await prisma.notification.create({
        data: {
          recipientEmail: tenant.email,
          type: "quote_request",
          title: "Új ajánlatkérés érkezett",
          body: `${clientName} ajánlatot kér: ${workTypes.join(", ")}`,
          sessionId,
        },
      });
      notifiedCount++;
    } catch (e) {
      console.error(`[notify-all] Notification failed for ${tenant.email}:`, e);
    }
  }

  // Audit log
  await prisma.quoteAuditLog.create({
    data: {
      sessionId,
      userEmail: "system",
      action: "notify_all_contractors",
      details: JSON.parse(JSON.stringify({
        totalTenants: tenants.length,
        emailsSent: sentCount,
        notificationsSent: notifiedCount,
        workTypes,
      })),
    },
  }).catch((e) => console.error("[audit] notify_all log failed:", e));

  return {
    success: true,
    message: `Ajánlatkérést elküldtük a kivitelezőknek.`,
    sentCount,
    notifiedCount,
  };
}

/**
 * Get client quote session data by sessionId — used by contractors to view the request.
 */
export async function getClientQuoteSession(sessionId: string) {
  const session = await prisma.history.findFirst({
    where: {
      recordId: sessionId,
      aiAgentType: "client-quote",
    },
    select: {
      recordId: true,
      content: true,
      metaData: true,
      status: true,
      userEmail: true,
      createdAt: true,
    },
  });

  if (!session) return null;

  // Extract the user's original description from the first message
  const messages = (session.content as { role: string; content: string }[]) || [];
  const userMessages = messages.filter((m) => m.role === "user");
  const firstUserMessage = userMessages[0]?.content || "";

  // Extract the AI-generated estimate if available
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.content.includes("---AJÁNLAT_KEZDET---"));
  let estimate = "";
  if (lastAssistant) {
    const start = lastAssistant.content.indexOf("---AJÁNLAT_KEZDET---");
    const end = lastAssistant.content.indexOf("---AJÁNLAT_VÉGE---");
    if (start !== -1 && end !== -1) {
      estimate = lastAssistant.content.slice(start + "---AJÁNLAT_KEZDET---".length, end).trim();
    }
  }

  const meta = session.metaData as Record<string, unknown> | null;

  return {
    sessionId: session.recordId,
    clientEmail: session.userEmail,
    clientName: (meta?.contact as Record<string, unknown>)?.name as string || "Megrendelő",
    description: firstUserMessage,
    estimate,
    workTypes: (meta?.workTypes as string[]) || [],
    location: (meta?.location as string) || "",
    dimensions: meta?.dimensions || null,
    status: session.status,
    createdAt: session.createdAt,
  };
}

/**
 * Get incoming quote requests for a contractor — based on their notifications.
 */
export async function getIncomingQuoteRequests(email: string) {
  // Get all quote_request notifications for this contractor
  const notifications = await prisma.notification.findMany({
    where: {
      recipientEmail: email,
      type: "quote_request",
      sessionId: { not: null },
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (notifications.length === 0) return [];

  // Fetch session data for each notification
  const sessionIds = notifications.map((n) => n.sessionId).filter(Boolean) as string[];
  const sessions = await prisma.history.findMany({
    where: {
      recordId: { in: sessionIds },
      aiAgentType: "client-quote",
    },
    select: {
      recordId: true,
      metaData: true,
      status: true,
      createdAt: true,
    },
  });

  const sessionMap = new Map(sessions.map((s) => [s.recordId, s]));

  return notifications.map((n) => {
    const session = sessionMap.get(n.sessionId!);
    const meta = session?.metaData as Record<string, unknown> | null;
    return {
      notificationId: n.id,
      sessionId: n.sessionId!,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt,
      clientName: (meta?.contact as Record<string, unknown>)?.name as string || "Megrendelő",
      workTypes: (meta?.workTypes as string[]) || [],
      location: (meta?.location as string) || "",
    };
  });
}

/**
 * Decline a quote request — hides it permanently from the contractor's list.
 */
export async function declineQuoteRequest(notificationId: number, email: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientEmail: email },
    data: { status: "declined", isRead: true },
  });
}

/**
 * Accept a quote request — marks it so it won't show in the incoming list.
 */
export async function acceptQuoteRequest(notificationId: number, email: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientEmail: email },
    data: { status: "accepted", isRead: true },
  });
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadNotificationCount(email: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientEmail: email, isRead: false },
  });
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(email: string) {
  return prisma.notification.findMany({
    where: { recipientEmail: email },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Mark notification as read.
 */
export async function markNotificationRead(id: number, email: string) {
  return prisma.notification.updateMany({
    where: { id, recipientEmail: email },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(email: string) {
  return prisma.notification.updateMany({
    where: { recipientEmail: email, isRead: false },
    data: { isRead: true },
  });
}

function buildQuoteRequestEmail(
  clientName: string,
  estimate: string,
  workTypes: string[],
  sessionId?: string
): string {
  const cleanEstimate = estimate
    .replace(/\*\*/g, "")
    .replace(/---AJÁNLAT_KEZDET---|---AJÁNLAT_VÉGE---/g, "")
    .replace(/[\d.,]+\s*Ft/g, "—")
    .trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.offerflow.hu";
  const acceptLink = sessionId ? `${appUrl}/offers/from-request/${sessionId}` : appUrl;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Új ajánlatkérés érkezett</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">OfferFlow platform</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p><strong>Megrendelő:</strong> ${clientName}</p>
        <p><strong>Munkanemek:</strong> ${workTypes.join(", ")}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        <h3 style="color: #f97316;">Tétellista</h3>
        <pre style="background: #f9fafb; padding: 16px; border-radius: 8px; font-size: 13px; white-space: pre-wrap;">${cleanEstimate}</pre>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        <div style="text-align: center; margin: 24px 0;">
          <a href="${acceptLink}" style="display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Ajánlatkérés megtekintése
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          Jelentkezzen be az OfferFlow rendszerbe az ajánlat elkészítéséhez.
        </p>
      </div>
    </div>
  `;
}
