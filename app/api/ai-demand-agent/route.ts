import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { inngest } from "@/inngest/client";
import axios from "axios";
import { currentUser } from "@clerk/nextjs/server";
export async function POST(req: NextRequest) {
    const FormData = await req.formData();
    const demandFile = FormData.get('demandFile');
    if (!(demandFile instanceof File)) {
        return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }
    const recordId = FormData.get('recordId');
    const user = await currentUser();
    const loader = new WebPDFLoader(demandFile);
    const docs = await loader.load();
    // Fűzd össze az összes oldal szövegét
    const fullPdfText = docs.map(doc => doc.pageContent).join('\n---\n');
    console.log(fullPdfText)// Teljes PDF szöveg

    const arrayBuffer = await demandFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const resultIds = await inngest.send({
        name: 'AiDemandAgent',
        data: {
            recordId: recordId,
            base64DemandFile: base64,
            pdfText: fullPdfText,
            aiAgentType: '/ai-tools/ai-demand-analyzer',
            userEmail: user?.primaryEmailAddress?.emailAddress
        }
    });
    const runId = resultIds?.ids[0];
    console.log(runId)
    let runStatus;
    while (true) {
        runStatus = await getRuns(runId);
        console.log(runStatus?.data, 'data');
        if (runStatus?.data[0]?.status === 'Completed') {
            break;
        }
        if (runStatus?.data[0]?.status === 'Cancelled') {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 500))
    }
    return NextResponse.json(runStatus.data)

}

const getRuns = async (runId: string) => {
    console.log('URL:inngest_host:', process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs');

    const result = await axios.get(process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs', {
        headers: {
            Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
        }
    })

    return result.data
}