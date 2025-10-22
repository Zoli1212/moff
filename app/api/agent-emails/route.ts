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

  interface GmailMessageListItem {
    id?: string | null;
    threadId?: string | null;
  }
  interface GmailHeader {
    name?: string | null;
    value?: string | null;
  }
  // Only fetch details for messages with a valid id
  const messageDetails = await Promise.all(
    (messages as GmailMessageListItem[])
      .filter((msg) => !!msg.id)
      .map((msg) => gmail.users.messages.get({ userId: 'me', id: msg.id as string }))
  );

  const subjects = messageDetails.map((msg) => {
    const headers: GmailHeader[] = msg?.data?.payload?.headers || [];
    const subjectHeader = headers.find((h) => h.name === 'Subject');
    return subjectHeader?.value ?? '';
  });

  return NextResponse.json({ subjects });
}
