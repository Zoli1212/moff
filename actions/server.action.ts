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

