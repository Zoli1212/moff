import { NextResponse } from 'next/server';
import { getUserWorks } from '@/actions/work-actions';
import { Work } from '@/app/(works)/works/page';


export async function GET() {
  try {
    const works: Work [] = await getUserWorks();
    const workItems = works.flatMap((work: Work) => work.workItems || []);
    return NextResponse.json({ workItems });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Hiba történt a feladatok lekérésekor' }, { status: 500 });
  }
}
