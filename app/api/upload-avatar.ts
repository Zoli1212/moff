import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT_URL || '',
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: file.name || `avatar_${Date.now()}`,
      folder: '/avatars',
    });
    return NextResponse.json({ url: uploadResponse.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Upload failed' }, { status: 500 });
  }
}
