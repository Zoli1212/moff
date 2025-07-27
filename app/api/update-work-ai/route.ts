import { NextRequest, NextResponse } from 'next/server';
import { updateWorkWithAIResult } from '@/actions/work-actions';

export async function POST(req: NextRequest) {
  try {
    const { workId, aiResult } = await req.json();
    if (!workId || !aiResult) {
      return NextResponse.json({ error: 'workId és aiResult kötelező!' }, { status: 400 });
    }
    const result = await updateWorkWithAIResult(Number(workId), aiResult);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Szerver hiba' }, { status: 500 });
  }
}
