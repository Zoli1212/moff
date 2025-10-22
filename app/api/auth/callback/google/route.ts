export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@clerk/nextjs/server";
import { authorizeWithCode } from "../../test/googleAuth";


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!code) {
    return NextResponse.json({ error: "Missing code param" }, { status: 400 });
  }

  try {
   await authorizeWithCode(code, email!);
    return NextResponse.redirect(`${process.env.APP_URL}/email-list`); // vagy bárhova
  } catch (e) {
    const errorMsg = (typeof e === 'object' && e && 'message' in e)
      ? (e as { message: string }).message
      : String(e);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
