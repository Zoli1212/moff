import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
        }

        const formData = await req.formData();
        const emailContent = formData.get('emailContent')?.toString();
        const recordId = formData.get('recordId')?.toString();
        const emailId = formData.get('emailId')?.toString();

        if (!emailContent || !recordId || !emailId) {
            return NextResponse.json(
                { error: "Hiányzó kötelező mezők" },
                { status: 400 }
            );
        }

        console.log('Sending EmailAnalyzer event with recordId:', recordId);
        
        // Trigger the email analysis
        try {
            const result = await inngest.send({
                name: 'EmailAnalyzer',
                data: {
                    recordId,
                    emailContent: emailContent.substring(0, 500) + (emailContent.length > 500 ? '...' : ''), // Log first 500 chars
                    userEmail: user.primaryEmailAddress?.emailAddress || '',
                    metadata: {
                        emailId,
                        analyzedAt: new Date().toISOString()
                    }
                },
            });

            const eventId = result.ids?.[0];
            console.log('Inngest event sent. Event ID:', eventId, 'Record ID:', recordId);
            
            return NextResponse.json({ 
                status: "queued", 
                eventId,
                recordId 
            });
        } catch (error) {
            console.error('Error sending Inngest event:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error in email analysis:', error);
        return NextResponse.json(
            { error: "Hiba történt az email elemzése során" },
            { status: 500 }
        );
    }
}
