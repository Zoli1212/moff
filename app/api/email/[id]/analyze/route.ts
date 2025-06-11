// app/api/emails/[id]/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';


export async function GET(req: NextRequest) {
  const access_token = req.nextUrl.searchParams.get('token');
  const messageId = req.nextUrl.searchParams.get('id');

  const messageRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const message = await messageRes.json();

  // 1. E-mail szöveg dekódolása
  interface GmailMessagePart {
  mimeType?: string;
  body?: {
    data?: string;
    attachmentId?: string;
  };
  filename?: string;
  [key: string]: unknown;
}
  const parts: GmailMessagePart[] = message.payload.parts || [];
  const textPart = parts.find((p: GmailMessagePart) => p.mimeType === 'text/plain' && p.body?.data);

  const emailBase64 = textPart?.body?.data || '';
  const emailText = Buffer.from(emailBase64, 'base64').toString('utf-8');
  const emailDoc = new Document({ pageContent: emailText, metadata: { type: 'email' } });

  // 2. Melléklet (PDF) lekérése
  const pdfPart = parts.find(
    (p: GmailMessagePart) => p.filename?.endsWith('.pdf') && p.body?.attachmentId
  );

  if (!pdfPart?.body?.attachmentId) {
    return NextResponse.json({ error: 'PDF melléklet nem található vagy hiányzik az attachmentId' }, { status: 404 });
  }

  const attachmentRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${pdfPart.body.attachmentId}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const attachmentData = await attachmentRes.json();

  const pdfFilename = pdfPart.filename || 'melleklet.pdf';
  const pdfBuffer = Buffer.from(attachmentData.data, 'base64');
  const tempPath = path.join('/tmp', pdfFilename);
  await fs.writeFile(tempPath, pdfBuffer);

  // 3. PDF feldolgozása
  const loader = new PDFLoader(tempPath);
  const pdfDocs = await loader.load();

  // 4. Egyesített tartalom
  const allDocs = [emailDoc, ...pdfDocs];
  const combinedText = allDocs.map(doc => doc.pageContent).join('\n\n');

  return NextResponse.json({
    filename: pdfFilename,
    content: combinedText
  });
}
