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
  workTypes: string[],
  includesPrices: boolean,
  clientMessage?: string
) {
  let sentCount = 0;
  let notifiedCount = 0;

  // 1. Always send email via Resend
  try {
    await resend.emails.send({
      from: "OfferFlow <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Új ajánlatkérés — ${workTypes.join(", ")}`,
      html: buildQuoteRequestEmail(clientName, recipientEmail, estimate, workTypes, includesPrices, clientMessage),
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
        includesPrices,
      })),
    },
  }).catch((e) => console.error("[audit] quote_request_sent log failed:", e));

  return {
    success: true,
    message: `Az ajánlatkérést elküldtük a(z) ${recipientEmail} címre.${notifiedCount > 0 ? " A kivitelező értesítést is kapott a rendszerben." : ""}`,
    sentCount,
    notifiedCount,
  };
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
  clientEmail: string,
  estimate: string,
  workTypes: string[],
  includesPrices: boolean,
  clientMessage?: string
): string {
  const cleanEstimate = estimate
    .replace(/\*\*/g, "")
    .replace(/---AJÁNLAT_KEZDET---|---AJÁNLAT_VÉGE---/g, "")
    .trim();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Új ajánlatkérés érkezett</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">OfferFlow platform</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p><strong>Megrendelő:</strong> ${clientName} (${clientEmail})</p>
        <p><strong>Munkanemek:</strong> ${workTypes.join(", ")}</p>
        ${clientMessage ? `<div style="background: #fffbeb; border-left: 3px solid #f97316; padding: 12px 16px; margin: 12px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Megrendelő üzenete:</strong></p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #78350f;">${clientMessage}</p>
        </div>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        <h3 style="color: #f97316;">Előzetes ${includesPrices ? "árajánlat" : "tétellista"}</h3>
        <pre style="background: #f9fafb; padding: 16px; border-radius: 8px; font-size: 13px; white-space: pre-wrap;">${cleanEstimate}</pre>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 13px;">
          A megrendelő az OfferFlow platformon keresztül kéri az ajánlat pontosítását.
          Kérjük, vegye fel a kapcsolatot a megrendelővel a fenti elérhetőségeken.
        </p>
      </div>
    </div>
  `;
}
