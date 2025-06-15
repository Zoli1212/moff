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

        console.log('Looking for analysis with recordId:', recordId);

        // First, log all records in the database for debugging
        console.log('Fetching all history records...');
        const allRecords = await prisma.history.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10 // Just get the most recent 10 records
        });

        console.log(`Found ${allRecords.length} recent records in DB`);
        allRecords.forEach((record, index) => {
            console.log(`Record ${index + 1}:`, {
                id: record.id,
                recordId: record.recordId,
                aiAgentType: record.aiAgentType,
                createdAt: record.createdAt,
                hasContent: !!record.content,
                contentKeys: record.content ? Object.keys(record.content) : []
            });
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
            console.log('Found matching analysis in DB:', {
                id: analysis.id,
                recordId: analysis.recordId,
                createdAt: analysis.createdAt,
                contentKeys: analysis.content ? Object.keys(analysis.content) : []
            });
            
            return NextResponse.json({
                status: 'Completed',
                result: analysis.content,
                message: 'Analysis completed successfully'
            });
        } else {
            console.log('No matching analysis found for recordId:', recordId);
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
