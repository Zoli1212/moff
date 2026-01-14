import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserData } from '@/actions/user-actions';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const userData = await getCurrentUserData();
    if (!userData || !('email' in userData) || !userData.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let extractedText = '';

    // Process based on file type
    if (file.type === 'application/pdf') {
      // Parse PDF
      extractedText = await parsePDF(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    ) {
      // Parse Excel
      extractedText = await parseExcel(file);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from file' }, { status: 400 });
    }

    // Send to OpenAI to structure the offer request
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Te egy építési/felújítási ajánlatkérés feldolgozó asszisztens vagy.
A felhasználó egy fájlból kinyert szöveget fog küldeni (Excel vagy PDF).
A feladatod, hogy ebből egy jól strukturált, részletes ajánlatkérést készíts magyar nyelven.

Az ajánlatkérésnek tartalmaznia kell:
- A munka/projekt pontos leírását
- Szükséges anyagokat és mennyiségeket (ha vannak megadva)
- Helyszínt (ha van megadva)
- Határidőt (ha van megadva)
- Minden releváns információt

Formázd tisztán, érthetően, pontokba szedve.`,
        },
        {
          role: 'user',
          content: `Írd át ezt a szöveget részletes, strukturált ajánlatkéréssé:\n\n${extractedText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const parsedText = completion.choices[0]?.message?.content || extractedText;

    return NextResponse.json({ parsedText, success: true });
  } catch (error) {
    console.error('Error parsing offer file:', error);
    return NextResponse.json(
      { error: 'Failed to process file', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function parseExcel(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  let allText = '';

  // Iterate through all sheets
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    allText += `\n\n=== ${sheetName} ===\n`;

    // Convert array data to text
    sheetData.forEach((row: unknown) => {
      if (Array.isArray(row) && row.length > 0) {
        const rowText = row.filter(cell => cell != null && cell !== '').join(' | ');
        if (rowText.trim()) {
          allText += rowText + '\n';
        }
      }
    });
  });

  return allText.trim();
}

async function parsePDF(file: File): Promise<string> {
  try {
    const loader = new WebPDFLoader(file);
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join('\n\n');
    return fullText.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}
