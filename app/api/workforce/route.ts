import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all registry members, optionally filter by email/phone/name
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const phone = searchParams.get('phone');
  const name = searchParams.get('name');
  const where: any = {};
  if (email) where.email = email;
  if (phone) where.phone = phone;
  if (name) where.name = name;
  const members = await prisma.workforceRegistry.findMany({ where });
  return NextResponse.json(members);
}

// POST: Create a new registry member
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone } = body;
  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: 'Name and at least email or phone required' }, { status: 400 });
  }
  // Check if exists
  const existing = await prisma.workforceRegistry.findFirst({
    where: {
      name,
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });
  if (existing) return NextResponse.json(existing);
  const created = await prisma.workforceRegistry.create({ data: { name, email, phone } });
  return NextResponse.json(created);
}
