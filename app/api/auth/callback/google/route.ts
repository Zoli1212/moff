export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authorizeWithCode } from "../../test/googleAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code param" }, { status: 400 });
  }

  try {
    const client = await authorizeWithCode(code);
    return NextResponse.redirect("http://localhost:3000"); // vagy bárhova
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
