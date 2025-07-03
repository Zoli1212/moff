import { NextResponse } from 'next/server';
import { updateRequirement } from '@/actions/requirement-actions';

export async function POST(request: Request) {
  try {
    const { requirementId, data } = await request.json();

    // Update the requirement
    const result = await updateRequirement(requirementId, data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Hiba történt a követelmény frissítésekor' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      requirement: result.data,
    });
  } catch (error) {
    console.error('Error updating requirement:', error);
    return NextResponse.json(
      { error: 'Hiba történt a követelmény frissítése közben' },
      { status: 500 }
    );
  }
}
