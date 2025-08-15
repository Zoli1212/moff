import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const material = await prisma.material.update({
      where: { id },
      data: {
        availableQuantity: 0,
        availableFull: false,
      },
    });
    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
