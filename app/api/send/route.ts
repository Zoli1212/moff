// app/api/send/route.ts

import { Resend } from 'resend';

import { NextRequest, NextResponse } from "next/server";

function getOfferEmail(email: string) {
  return `
    <div>
      <h1>Kedves Ügyfélünk, ${email}!</h1>
      <p>Mellékletben küldjük Önöknek ajánlatunkat.</p>
    </div>
  `;
}

const resend = new Resend(process.env.RESEND_API_KEY);

type Attachment = {
  filename: string;
  content: string;
};

export async function POST(req: NextRequest) {
  const json = req.json();
  const { email, attachments }: { email: string; attachments: Attachment[] } = await json;

  console.log('API /send called with:', { email, attachments });

  try {
    const html = getOfferEmail(email);
    const data = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [email],
      subject: 'Offer',
      text: 'Offer from our company',
      html: html,
      attachments: attachments.map((file: Attachment) => ({
        filename: file.filename,
        content: file.content,
      })),
    });

    console.log('Resend API response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error });
  }
}