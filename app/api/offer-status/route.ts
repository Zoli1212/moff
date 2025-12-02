import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId");

  if (!recordId) {
    return NextResponse.json(
      { error: "Missing recordId parameter" },
      { status: 400 }
    );
  }

  try {
    // Ellenőrizzük, hogy létezik-e az ajánlat az adatbázisban
    const offer = await prisma.offer.findFirst({
      where: { recordId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        items: true,
      },
    });

    if (offer) {
      // Az ajánlat létezik, sikeres generálás
      return NextResponse.json({
        status: "completed",
        offer: offer,
      });
    } else {
      // Az ajánlat még nem létezik, még fut a generálás
      return NextResponse.json({
        status: "processing",
        message: "Offer is still being generated...",
      });
    }
  } catch (error) {
    console.error("Error checking offer status:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to check offer status",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
