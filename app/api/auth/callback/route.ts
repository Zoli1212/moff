import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const client_id = process.env.GMAIL_CLIENT_ID!;
  const client_secret = process.env.GMAIL_CLIENT_SECRET!;
  const redirect_uri = process.env.GMAIL_REDIRECT_URI!;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code || '',
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });

  const token = await tokenRes.json();

  // ideiglenes: redirect tokennel (helyette inkább cookie/db)
  return NextResponse.redirect(`/pdf-analyze?token=${token.access_token}`);
}
