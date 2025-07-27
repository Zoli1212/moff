import { NextRequest, NextResponse } from 'next/server';

// Helper to call OpenAI API
type OfferItem = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  materialUnitPrice: string;
  workTotal: string;
  materialTotal: string;
  totalPrice: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Expecting: location, description, estimatedDuration, offerItems
    const { location, description, estimatedDuration, offerItems } = body;

    // Compose the prompt for OpenAI
    const prompt = `A következő munkára készíts részletes Work breakdown-t:
Location: ${location}
Description: ${description}
Estimated duration: ${estimatedDuration}
Offer items: ${JSON.stringify(offerItems, null, 2)}

A válaszod legyen JSON, tartalmazza: location, totalWorkers, totalLaborCost, totalTools, totalToolCost, totalMaterialCost, estimatedDuration, és minden offerItem-ből egy WorkItem-et, ahol megadod: milyen szakember(ek) kellenek, milyen anyag, milyen eszköz, mennyi, stb. Minden mező legyen benne!`;

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Te egy magyar építőipari projektmenedzser vagy.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });
    const data = await openaiRes.json();
    // Try to parse the JSON from the response
    let parsed = null;
    let content = '';
    try {
      content = data.choices?.[0]?.message?.content;
      // Log the full OpenAI response and content for debug
      console.log('--- OPENAI RAW RESPONSE ---');
      console.dir(data, { depth: null });
      console.log('--- OPENAI CONTENT FIELD ---');
      console.log(content);
      // Remove markdown code block markers and whitespace
      let cleaned = content.trim()
        .replace(/^```json[\r\n]*/i, '')
        .replace(/^```[\r\n]*/i, '')
        .replace(/```$/, '')
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonErr) {
        // Ha így sem sikerül, próbáld regex-szel kinyerni az első {...} blokkot
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (innerErr) {
            // Ha ez sem sikerül, dobj hibát
            throw innerErr;
          }
        } else {
          throw jsonErr;
        }
      }
    } catch (e) {
      return NextResponse.json({ error: 'OpenAI válasz nem volt JSON.', openaiContent: content, openaiRaw: data }, { status: 500 });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: 'Hiba a kérés feldolgozásakor.' }, { status: 500 });
  }
}
