import { NextResponse } from 'next/server';
import { getUserWorks } from '@/actions/work-actions';

export async function GET() {
  try {
    const works = await getUserWorks();
    const workItems = works.flatMap((work: any) => work.workItems || []);
    return NextResponse.json({ workItems });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Hiba történt a feladatok lekérésekor' }, { status: 500 });
  }
}
