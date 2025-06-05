import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { inngest } from "@/inngest/client";
import axios from "axios";
import { currentUser } from "@clerk/nextjs/server";
export async function POST(req: NextRequest) {
    const FormData = await req.formData();
    const resumeFile: any = FormData.get('resumeFile');
    const recordId = FormData.get('recordId');
    const user = await currentUser();
    const loader = new WebPDFLoader(resumeFile);
    const docs = await loader.load();
    console.log(docs[0])// Raw Pdf Text

    const arrayBuffer = await resumeFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const resultIds = await inngest.send({
        name: 'AiDemandAgent',
        data: {
            recordId: recordId,
            base64DemandFile: base64,
            pdfText: docs[0]?.pageContent,
            aiAgentType: '/ai-tools/ai-demand-analyzer',
            userEmail: user?.primaryEmailAddress?.emailAddress
        }
    });
    const runId = resultIds?.ids[0];
    console.log(runId)
    let runStatus;
    while (true) {
        runStatus = await getRuns(runId);
        console.log(runStatus?.data);
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
    const result = await axios.get(process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs', {
        headers: {
            Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
        }
    })

    return result.data
}