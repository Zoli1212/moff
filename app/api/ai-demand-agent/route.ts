import { NextRequest, NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
// import { Readable } from 'stream';

// async function bufferToStream(buffer: Buffer): Promise<Readable> {
//   const stream = new Readable();
//   stream.push(buffer);
//   stream.push(null);
//   return stream;
// }

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromExcel(buffer: Buffer, fileType: string): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let text = '';
  console.log(fileType)
  
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
        const demandFile = formData.get('demandFile') as File | null;
        const recordId = formData.get('recordId')?.toString();
        const textContent = formData.get('textContent')?.toString();
        const type = formData.get('type')?.toString() || 'demand-analyzer';
        
        // Kezeljük a meglévő tételeket, ha vannak
        let existingItems = [];
        try {
          const existingItemsStr = formData.get('existingItems')?.toString();
          if (existingItemsStr) {
            existingItems = JSON.parse(existingItemsStr);
            if (!Array.isArray(existingItems)) {
              existingItems = [];
            }
          }
        } catch (error) {
          console.error('Hibás existingItems formátum:', error);
          existingItems = [];
        }

        if (!recordId) {
            return NextResponse.json({ error: "Hiányzó recordId" }, { status: 400 });
        }

        const user = await currentUser();
        let content = '';
        let base64File = '';
        let fileType = '';
        let fileName = '';

        if (demandFile instanceof File) {
            content = await extractTextFromFile(demandFile);
            const arrayBuffer = await demandFile.arrayBuffer();
            base64File = Buffer.from(arrayBuffer).toString('base64');
            fileType = demandFile.type;
            fileName = demandFile.name;
        } else if (textContent) {
            content = textContent;
            fileType = 'text/plain';
            fileName = 'text-input.txt';
        } else {
            return NextResponse.json({ error: "Hiányzó bemeneti adat" }, { status: 400 });
        }

        const aiAgentType = type === 'offer-letter' 
            ? '/ai-tools/ai-offer-letter' 
            : '/ai-tools/ai-demand-analyzer';
    
        const isOfferLetter = type === 'offer-letter';
        const eventData = isOfferLetter 
            ? { 
                userInput: content, // For AiOfferAgent
                recordId,
                userEmail: user?.emailAddresses?.[0]?.emailAddress,
                existingItems: existingItems // Hozzáadjuk a meglévő tételeket
              }
            : {
                // For AiDemandAgent
                recordId,
                base64DemandFile: base64File,
                fileText: content,
                fileType,
                fileName,
                aiAgentType,
                userEmail: user?.emailAddresses?.[0]?.emailAddress,
                inputType: demandFile ? 'file' : 'text',
              };

        const result = await inngest.send({
            name: isOfferLetter ? 'AiOfferAgent' : 'AiDemandAgent',
            data: eventData,
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