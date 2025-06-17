import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';


export async function GET(
  request: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const user = await currentUser();

    console.log(user, 'user')
    const userEmail= user?.emailAddresses?.[0]?.emailAddress;
0
    const recordId = (await params).recordId;
    
    if (!userEmail) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!recordId) {
        return new NextResponse(
          JSON.stringify({ error: 'Record ID is required' }), 
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

    const record = await prisma.history.findFirst({
      where: {
        recordId: recordId,
        aiAgentType: 'ai-offer-letter',
        tenantEmail: userEmail,
      },
    });

    console.log(record, 'record')
    if (!record) {
      return new NextResponse(
        JSON.stringify({ error: 'Offer not found' }), 
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }


    // Parse the content if it's a string
    let parsedContent: any = record.content;
    if (typeof parsedContent === 'string') {
      try {
        parsedContent = JSON.parse(parsedContent);
      } catch (e) {
        console.error('Error parsing content:', e);
        parsedContent = { output: [] };
      }
    }

    // Safely get output
    const output = Array.isArray(parsedContent?.output) 
      ? parsedContent.output 
      : [];

      console.log(output, 'output')

    // Prepare the response data
    const responseData = {
      id: record.id,
      recordId: record.recordId,
      content: parsedContent,
      output: output,
      metaData: record.metaData && typeof record.metaData === 'object' 
        ? record.metaData 
        : {},
      createdAt: record.createdAt || new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
