export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { getGoogleAuthUrl } from "./googleAuth";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  console.log(req.url)

  const url = await getGoogleAuthUrl(user?.emailAddresses?.[0]?.emailAddress!);
  console.log(url, 'url')
  return NextResponse.json({ url });
}
