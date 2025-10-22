import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req?.nextUrl?.searchParams;
        const recordId = searchParams?.get('eventId');

        if (!recordId) {
            return NextResponse.json(
                { error: "Hiányzó recordId paraméter" },
                { status: 400 }
            );
        }

        const allRecords = await prisma.history.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10 // Just get the most recent 10 records
        });

        // Try to find the specific record
        const analysis = await prisma.history.findFirst({
            where: {
                recordId: recordId,
                aiAgentType: "/ai-tools/email-analyzer"
            },
            orderBy: { createdAt: 'desc' },
        });

        if (analysis) {
            return NextResponse.json({
                status: 'Completed',
                result: analysis.content,
                message: 'Analysis completed successfully'
            });
        } else {
            return NextResponse.json(
                { 
                    status: 'not_found', 
                    message: 'Analysis not found',
                    debug: {
                        searchedRecordId: recordId,
                        recentRecordIds: allRecords.map(r => r.recordId)
                    }
                },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error('Error in status endpoint:', error);
        return NextResponse.json(
            { 
                status: 'error',
                error: "Hiba történt az állapot ellenőrzése során"
            },
            { status: 500 }
        );
    }
}
