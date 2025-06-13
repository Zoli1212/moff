import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

async function bufferToStream(buffer: Buffer): Promise<Readable> {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromExcel(buffer: Buffer, fileType: string): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let text = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n';
  });
  
  return text;
}

async function extractTextFromCsv(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  if (file.type === 'application/pdf') {
    const loader = new WebPDFLoader(file);
    const docs = await loader.load();
    return docs.map(doc => doc.pageContent).join('\n---\n');
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDocx(buffer);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
    file.type === 'application/vnd.ms-excel'
  ) {
    return await extractTextFromExcel(buffer, file.type);
  } else if (file.type === 'text/csv') {
    return await extractTextFromCsv(buffer);
  } else {
    throw new Error('Unsupported file type');
  }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const demandFile = formData.get('demandFile');
        const recordId = formData.get('recordId')?.toString();
    
        if (!(demandFile instanceof File)) {
            return NextResponse.json({ error: "Hiányzó vagy érvénytelen fájl" }, { status: 400 });
        }
    
        const user = await currentUser();
        const fileText = await extractTextFromFile(demandFile);
        const arrayBuffer = await demandFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
    
        const result = await inngest.send({
            name: 'AiDemandAgent',
            data: {
                recordId,
                base64DemandFile: base64,
                fileText,
                fileType: demandFile.type,
                fileName: demandFile.name,
                aiAgentType: '/ai-tools/ai-demand-analyzer',
                userEmail: user?.primaryEmailAddress?.emailAddress,
            },
        });
    
        const eventId = result.ids?.[0];
        return NextResponse.json({ status: "queued", eventId });
    } catch (error) {
        console.error('Error processing file:', error);
        return NextResponse.json(
            { error: "Hiba történt a fájl feldolgozása során" }, 
            { status: 500 }
        );
    }
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