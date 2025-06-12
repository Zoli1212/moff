import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { inngest } from "@/inngest/client";
import axios from "axios";
import { currentUser } from "@clerk/nextjs/server";
// app/api/ai-demand-agent/route.ts

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const demandFile = formData.get('demandFile');
    const recordId = formData.get('recordId')?.toString();
  
    if (!(demandFile instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }
  
    const user = await currentUser();
    const loader = new WebPDFLoader(demandFile);
    const docs = await loader.load();
    const fullPdfText = docs.map(doc => doc.pageContent).join('\n---\n');
    const arrayBuffer = await demandFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
  
    const result = await inngest.send({
      name: 'AiDemandAgent',
      data: {
        recordId,
        base64DemandFile: base64,
        pdfText: fullPdfText,
        aiAgentType: '/ai-tools/ai-demand-analyzer',
        userEmail: user?.primaryEmailAddress?.emailAddress,
      },
    });
  
    const eventId = result.ids?.[0];
    return NextResponse.json({ status: "queued", eventId });
  }
  

// const getRuns = async (runId: string) => {
//     console.log('URL:inngest_host:', process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs');

//     const result = await axios.get(process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs', {
//         headers: {
//             Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
//         }
//     })

//     return result.data
// }