import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserData } from '@/actions/user-actions';
import OpenAI from 'openai';

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

    const { extractedText, fileName } = await req.json();

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Send to OpenAI to structure the offer request
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Te egy építési/felújítási ajánlatkérés feldolgozó asszisztens vagy.
A felhasználó egy fájlból (${fileName}) kinyert szöveget fog küldeni.
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
    console.error('Error processing offer text:', error);
    return NextResponse.json(
      { error: 'Failed to process text', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
