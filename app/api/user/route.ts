import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // vagy a helyes elérési út, ahol a Prisma kliens van exportálva
import { currentUser } from "@clerk/nextjs/server";

export async function POST(_req: NextRequest) {

  console.log(_req.url)

  try {
    const user = await currentUser();

    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "Unauthorized or missing email address" },
        { status: 401 }
      );
    }

    const email = user.emailAddresses?.[0]?.emailAddress;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperUser: true,
        theme: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    // Insert new user
    const newUser = await prisma.user.create({
      data: {
        name: user.fullName ?? "",
        email: email,
      },
    });

    return NextResponse.json(newUser);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Server error" },
      { status: 500 }
    );
  }
}
