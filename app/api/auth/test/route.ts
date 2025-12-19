export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { getGoogleAuthUrl } from "./googleAuth";

export async function GET(_req: NextRequest) {
  const user = await currentUser();
  console.log(_req)

  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }
  const url = await getGoogleAuthUrl(email);
  return NextResponse.json({ url });
}
