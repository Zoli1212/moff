// app/api/agent-emails/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
  });

  const messages = res.data.messages || [];

  const messageDetails = await Promise.all(
    messages.map((msg: any) =>
      gmail.users.messages.get({ userId: 'me', id: msg.id! })
    )
  );

  const subjects = messageDetails.map((msg: any) => {
    const subjectHeader = msg.data.payload?.headers?.find(
      (h: any) => h.name === 'Subject'
    );
    return subjectHeader?.value;
  });

  return NextResponse.json({ subjects });
}
