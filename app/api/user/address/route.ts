import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch user's address
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 400 }
      );
    }

    const userData = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        address: true,
        city: true,
        zip: true,
        country: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update user's address
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { address, city, zip, country } = body;

    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: {
        address: address || null,
        city: city || null,
        zip: zip || null,
        country: country || null,
      },
    });

    return NextResponse.json({
      success: true,
      address: updatedUser.address,
      city: updatedUser.city,
      zip: updatedUser.zip,
      country: updatedUser.country,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
