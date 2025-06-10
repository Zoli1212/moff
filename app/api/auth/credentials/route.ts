import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/auth/credentials
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      client_id,
      project_id,
      auth_uri,
      token_uri,
      auth_provider_x509_cert_url,
      client_secret,
      redirect_uris,
      tenantEmail,
    } = body;

    if (!client_id || !project_id || !auth_uri || !token_uri || !auth_provider_x509_cert_url || !client_secret || !redirect_uris || !tenantEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure redirect_uris is an array
    if (!Array.isArray(redirect_uris)) {
      return NextResponse.json({ error: 'redirect_uris must be an array' }, { status: 400 });
    }

    const credential = await prisma.googleOAuthCredential.create({
      data: {
        client_id,
        project_id,
        auth_uri,
        token_uri,
        auth_provider_x509_cert_url,
        client_secret,
        redirect_uris,
        tenantEmail,
      },
    });

    const response = {
      web: {
        client_id: credential.client_id,
        project_id: credential.project_id,
        auth_uri: credential.auth_uri,
        token_uri: credential.token_uri,
        auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
        client_secret: credential.client_secret,
        redirect_uris: credential.redirect_uris,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request or server error', details: (error as Error)?.message }, { status: 500 });
  }
}

// GET /api/auth/credentials?tenantEmail=...  (tenantEmail is optional, returns first if not specified)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantEmail = searchParams.get('tenantEmail');

  const where = tenantEmail ? { tenantEmail } : {};
  const credential = await prisma.googleOAuthCredential.findFirst({ where });

  if (!credential) {
    return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
  }

  // Format to match loadCredentialsDirect structure
  const response = {
    web: {
      client_id: credential.client_id,
      project_id: credential.project_id,
      auth_uri: credential.auth_uri,
      token_uri: credential.token_uri,
      auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
      client_secret: credential.client_secret,
      redirect_uris: credential.redirect_uris, // should be array
    },
  };

  return NextResponse.json(response);
}
