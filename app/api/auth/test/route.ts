export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { getGoogleAuthUrl } from "./googleAuth";

export async function GET(req: NextRequest) {
  const user = await currentUser();

  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }
  const url = await getGoogleAuthUrl(email);
  return NextResponse.json({ url });
}
