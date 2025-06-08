import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(req: any) {
    const { content, recordId, aiAgentType } = await req.json();
    const user = await currentUser();
    try {
        const result = await prisma.history.create({
            data: {
                recordId: recordId,
                content: content,
                userEmail: user?.primaryEmailAddress?.emailAddress || null,
                createdAt: new Date().toISOString(),
                aiAgentType: aiAgentType,
                tenantEmail: user?.primaryEmailAddress?.emailAddress || ''
            }
        });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json(e);
    }
}

export async function PUT(req: any) {
    const { content, recordId } = await req.json();
    try {
        const result = await prisma.history.updateMany({
            where: { recordId: recordId },
            data: { content: content }
        });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json(e);
    }
}


export async function GET(req: any) {
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId');
    const user = await currentUser();
    try {
        if (recordId) {
            const result = await prisma.history.findFirst({
                where: { recordId: recordId }
            });
            return NextResponse.json(result);
        } else {
            if (user?.primaryEmailAddress?.emailAddress) {
                const result = await prisma.history.findMany({
                    where: { userEmail: user.primaryEmailAddress.emailAddress },
                    orderBy: { id: 'desc' }
                });
                return NextResponse.json(result);
            }
        }
        return NextResponse.json({});
    } catch (e) {
        return NextResponse.json(e);
    }
}