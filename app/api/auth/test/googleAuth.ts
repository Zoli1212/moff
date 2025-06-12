import fs from "fs";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getEmail, listEmails } from "./gmail-fetch";
import { createEmail } from "@/actions/server.action";
import { gmail_v1 } from "googleapis";

const SCOPE = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const TOKEN_PATH = process.env.TOKEN_PATH;

// 🔐 Credentials lekérdezése adatbázisból Prisma-val
import { getGoogleCredentials } from "@/actions/server.action";
export async function loadCredentialsDirect(tenantEmail: string) {
  const cred = await getGoogleCredentials(tenantEmail);
  console.log(cred, 'cred')
  return {
    web: {
      client_id: cred.client_id,
      project_id: cred.project_id,
      auth_uri: cred.auth_uri,
      token_uri: cred.token_uri,
      auth_provider_x509_cert_url: cred.auth_provider_x509_cert_url,
      client_secret: cred.client_secret,
      redirect_uris: Array.isArray(cred.redirect_uris)
        ? cred.redirect_uris
        : typeof cred.redirect_uris === "string"
          ? [cred.redirect_uris]
          : [],
    },
  };
}

// Token mentése fájlba
async function saveCredentials(client: OAuth2Client, tenantEmail: string) {
  const credentials = await loadCredentialsDirect(tenantEmail);
  const key = credentials.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH as string, payload);
}

// Visszaadja az OAuth2Client példányt
export async function getOAuth2Client(
  tenantEmail: string
): Promise<OAuth2Client> {
  const credentials = await loadCredentialsDirect(tenantEmail);
  const { client_id, client_secret, redirect_uris } = credentials.web;
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    typeof redirect_uris[0] === "string" ? redirect_uris[0] : undefined
  );
}

// Visszaadja a bejelentkezési URL-t
export async function getGoogleAuthUrl(tenantEmail: string): Promise<string> {
  const client = await getOAuth2Client(tenantEmail);
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPE,
    prompt: "consent",
  });
}

function decodeHtmlEntity(str: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&eacute;": "é",
    "&egrave;": "è",
    "&agrave;": "à",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    // ➕ Bővíthető tetszés szerint
  };
  return entities[str.toLowerCase()] || "";
}

function extractEmailContent(email: gmail_v1.Schema$Message): string {
  function decodeBase64Gmail(encoded: string): string {
    const fixed = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(fixed, "base64").toString("utf-8");
  }

  function stripHtml(html: string): string {
    const decoded = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&[a-z]+;/gi, decodeHtmlEntity)
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const linkMatch = html.match(/<https?:\/\/[^>]+>/);
    if (linkMatch) {
      const url = linkMatch[0].replace(/[<>]/g, "");
      return decoded + ` – aktiválási link: ${url}`;
    }

    return decoded;
  }

  function extractTextContent(
    part?: gmail_v1.Schema$MessagePart
  ): string | null {
    if (!part) return null;

    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Gmail(part.body.data);
    }

    if (part.mimeType === "text/html" && part.body?.data) {
      return stripHtml(decodeBase64Gmail(part.body.data));
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        const result = extractTextContent(subPart);
        if (result) return result;
      }
    }

    return null;
  }

  const content = email.payload
    ? extractTextContent(email as gmail_v1.Schema$MessagePart)
    : null;
  return content || "(nincs tartalom)";
}

// Elmenti a token-t ha `code` érkezik a callback URL-lel
export async function authorizeWithCode(
  code: string,
  tenantEmail: string
): Promise<OAuth2Client> {
  const client = await getOAuth2Client(tenantEmail);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (tokens.refresh_token) {
    await saveCredentials(client, tenantEmail);
  }
  const messages = await listEmails(client);

  for (const msg of messages) {
    if (!msg.id) continue;

    const email = await getEmail(client, msg.id);
    const headers = email.payload?.headers || [];

    const from = headers.find((h) => h.name === "From")?.value;
    const subject = headers.find((h) => h.name === "Subject")?.value;

    const content = extractEmailContent(email);

    const attachmentFilenames: string[] = [];
    const gmail = google.gmail({ version: "v1", auth: client });

    if (email.payload?.parts) {
      for (const part of email.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachmentFilenames.push(part.filename);
          const attachment = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: msg.id,
            id: part.body.attachmentId,
          });

          const data = attachment.data?.data;
          if (data) {
            const fixedData = data.replace(/-/g, "+").replace(/_/g, "/");
            const buffer = Buffer.from(fixedData, "base64");
            const outputPath = `./attachments/${part.filename}`;
            fs.mkdirSync("./attachments", { recursive: true }); // biztosítsd, hogy létezik
            fs.writeFileSync(outputPath, buffer);
            console.log(`💾 Melléklet mentve: ${part.filename}`);
          }
        }
      }
    }

    // Email mentése server action-nel
    // importáld a createEmail-t a server.action-ből
    // import { createEmail } from "../../email/server.action";  <-- a helyes relatív útvonalat be kell állítani
    await createEmail({
      gmailId: msg.id,
      from: from || "",
      subject: subject || "",
      content: content || "",
      hasAttachment: attachmentFilenames.length > 0,
      attachmentFilenames,
      tenantEmail: tenantEmail || "",
    });

    console.log(
      `📧 ${subject || "(nincs tárgy)"} ← ${from || "(nincs feladó)"}`
    );
    console.log(`📝 Tartalom: ${content.substring(0, 200)}...`);
    console.log("--------------------------------------------------");
  }

  return client;
}
