// app/api/send/route.ts

import { Resend } from 'resend';

import { NextRequest, NextResponse } from "next/server";

function getOfferEmail(username: string) {
  return `
    <div>
      <h1>Welcome, ${username}!</h1>
    </div>
  `;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const json = req.json();
  const { username, attachments } = await json;

  console.log('API /send called with:', { username, attachments });

  try {
    const html = getOfferEmail(username);
    const data = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['deirdre.zm@gmail.com'],
      subject: 'Offer',
      text: 'Offer from our company',
      html: html,
      attachments: attachments.map((file: any) => ({
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