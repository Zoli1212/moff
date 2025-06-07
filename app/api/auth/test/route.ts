export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "./googleAuth";

export async function GET(req: NextRequest) {
  const url = getGoogleAuthUrl();
  return NextResponse.json({ url });
}
