export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authorizeWithCode } from "../../test/googleAuth";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  console.log(email, 'email');

  if (!code) {
    return NextResponse.json({ error: "Missing code param" }, { status: 400 });
  }

  try {
    const client = await authorizeWithCode(code, email!);
    return NextResponse.redirect("http://localhost:3000/email-list"); // vagy bárhova
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
