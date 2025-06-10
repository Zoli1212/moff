'use server'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type EmailCreateInput = {
  gmailId: string;
  from: string;
  subject: string;
  content: string;
  hasAttachment: boolean;
  attachmentFilenames: string[];
  tenantEmail: string;
};

export async function createEmail(input: EmailCreateInput) {
  // Ellenőrizzük, hogy létezik-e már ilyen gmailId
  const existing = await prisma.email.findUnique({
    where: { gmailId: input.gmailId },
  });

  if (existing) {
    // Már létezik ilyen gmailId, nem hozunk létre újat
    return null; // vagy dobhatunk hibát is, pl.: throw new Error('Ez a gmailId már létezik');
  }

  // Ha nincs, létrehozzuk
  return prisma.email.create({
    data: {
      gmailId: input.gmailId,
      from: input.from || "",
      subject: input.subject || "",
      content: input.content || "",
      hasAttachment: input.hasAttachment,
      attachmentFilenames: input.attachmentFilenames,
      tenantEmail: input.tenantEmail || '',
    },
  });
}

export async function getAllEmails() {
  return prisma.email.findMany({
    orderBy: { id: 'desc' }
  });
}

// Google OAuth credentials lekérése tenantEmail alapján
export async function getGoogleCredentials(tenantEmail: string) {
  const credential = await prisma.googleOAuthCredential.findFirst({
    where: { tenantEmail }
  });
  if (!credential) throw new Error("No credentials found");
  return {
    client_id: credential.client_id,
    project_id: credential.project_id,
    auth_uri: credential.auth_uri,
    token_uri: credential.token_uri,
    auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
    client_secret: credential.client_secret,
    redirect_uris: credential.redirect_uris,
  };
}

