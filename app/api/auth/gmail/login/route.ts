import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.GMAIL_CLIENT_ID!;
  const redirect_uri = process.env.GMAIL_REDIRECT_URI!;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url.toString());
}
