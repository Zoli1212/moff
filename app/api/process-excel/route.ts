import { NextResponse } from 'next/server';
import { processExcelWithAI } from '@/lib/excelProcessor';

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Process the Excel file
    const processedBuffer = await processExcelWithAI(uint8Array);

    // Convert buffer to base64
    const base64 = Buffer.from(processedBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      filename: `processed_${file.name}`,
      data: base64
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { error: 'Error processing Excel file' },
      { status: 500 }
    );
  }
}
