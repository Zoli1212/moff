import { inngest } from "@/inngest/client";
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req: any) {
    const { userInput } = await req.json();

    const resultIds = await inngest.send({
        name: 'AiOfferAgent',
        data: {
            userInput: userInput
        }
    });
    const runId = resultIds?.ids[0];
    console.log(runId, 'runID')
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

    console.log("runStatus:", JSON.stringify(runStatus, null, 2));
    return NextResponse.json(runStatus.data?.[0].output?.output[0])

}

const getRuns = async (runId: string) => {
    const result = await axios.get(process.env.INNGEST_SERVER_HOST + '/v1/events/' + runId + '/runs', {
        headers: {
            Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`
        }
    })

    return result.data
}