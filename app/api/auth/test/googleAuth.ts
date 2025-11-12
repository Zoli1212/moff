import fs from "fs";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getEmail, listEmails } from "./gmail-fetch";
import { createEmail } from "@/actions/email-actions";
import ImageKit from "imagekit";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT_URL || "",
});
import { gmail_v1 } from "googleapis";

const SCOPE = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const TOKEN_PATH = process.env.TOKEN_PATH;

// 🔐 Credentials lekérdezése adatbázisból Prisma-val
import { getGoogleCredentials } from "@/actions/email-actions";
export async function loadCredentialsDirect(tenantEmail: string) {
  const cred = await getGoogleCredentials(tenantEmail);
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

// function decodeHtmlEntity(str: string): string {
//   const entities: Record<string, string> = {
//     "&nbsp;": " ",
//     "&eacute;": "é",
//     "&egrave;": "è",
//     "&agrave;": "à",
//     "&amp;": "&",
//     "&lt;": "<",
//     "&gt;": ">",
//     "&quot;": '"',
//     "&apos;": "'",
//     // ➕ Bővíthető tetszés szerint
//   };
//   return entities[str.toLowerCase()] || "";
// }

function extractEmailContent(email: gmail_v1.Schema$Message): string {
  // Helper to clean up HTML entities and unwanted patterns
  function cleanContent(content: string): string {
    if (!content) return "";

    // Replace HTML entities
    const entities: { [key: string]: string } = {
      "&lt;": "<",
      "&gt;": ">",
      "&amp;": "&",
      "&quot;": '"',
      "&#39;": "'",
      "&nbsp;": " ",
      "&copy;": "©",
      "&reg;": "®",
      "&euro;": "€",
      "&pound;": "£",
      "&yen;": "¥",
      "&cent;": "¢",
      "&sect;": "§",
      "&para;": "¶",
      "&deg;": "°",
      "&plusmn;": "±",
      "&times;": "×",
      "&divide;": "÷",
      "&apos;": "'",
    };

    try {
      // First decode any URL encoded characters
      let cleaned = decodeURIComponent(content);

      // Replace HTML entities
      Object.entries(entities).forEach(([entity, replacement]) => {
        cleaned = cleaned.replace(new RegExp(entity, "g"), replacement);
      });

      // Remove email signatures and quoted text
      cleaned = cleaned
        // Remove lines starting with '>' (quoted text)
        .split("\n")
        .filter((line) => !line.trim().startsWith(">"))
        .join("\n")
        // Remove common email signature patterns (using [\s\S] instead of . with s flag for wider compatibility)
        .replace(/^--\s*\n[\s\S]*?\n(?:\n|$)/gm, "")
        .replace(/^_{2,}\n[\s\S]*?\n(?:\n|$)/gm, "")
        // Remove multiple spaces and newlines
        .replace(/\s+/g, " ")
        .trim();

      return cleaned;
    } catch (error) {
      console.error("Error cleaning content:", error);
      return content; // Return original if cleaning fails
    }
  }

  // Helper to decode base64 data
  function decodeBase64(encoded: string): string {
    try {
      const fixed = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(fixed, "base64").toString("utf-8");
      return cleanContent(decoded);
    } catch (error) {
      console.error("Error decoding base64:", error);
      return "";
    }
  }

  // Clean the snippet if available
  if (email.snippet) {
    return cleanContent(email.snippet);
  }

  // Recursive function to find text content in email parts
  function findTextContent(part: gmail_v1.Schema$MessagePart): string | null {
    if (!part) return null;

    // If this part has plain text, return it
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64(part.body.data);
    }

    // If this part has HTML, return it as plain text
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = decodeBase64(part.body.data);
      // Basic HTML to text conversion
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
        .replace(/<[^>]+>/g, " ") // Remove all HTML tags
        .replace(/\s+/g, " ") // Collapse whitespace
        .replace(/^\s+|\s+$/g, "") // Trim
        .trim();
    }

    // If this is a multipart message, search its parts
    if (part.mimeType?.startsWith("multipart/") && part.parts) {
      for (const subPart of part.parts) {
        const text = findTextContent(subPart);
        if (text) return text;
      }
    }

    // If this part has sub-parts, search them
    if (part.parts) {
      for (const subPart of part.parts) {
        const content = findTextContent(subPart);
        if (content) return content;
      }
    }

    // If this part has data, try to decode it
    if (part.body?.data) {
      try {
        return decodeBase64(part.body.data);
      } catch (e) {
        console.error("Error decoding part data:", e);
      }
    }

    return null;
  }

  // Try to get content from the email payload
  if (email.payload) {
    const content = findTextContent(email.payload);
    if (content) return content;
  }

  // If we get here, we couldn't extract any content
  return "(nincs elérhető tartalom)";
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
    const attachmentUrls: string[] = [];
    const gmail = google.gmail({ version: "v1", auth: client });

    if (email.payload?.parts) {
      for (const part of email.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          try {
            const attachment = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msg.id,
              id: part.body.attachmentId,
            });

            const data = attachment.data?.data;
            if (!data) {
              console.error("No data in attachment");
              continue;
            }

            // Clean up the base64 data
            const base64Data = data.replace(/-/g, "+").replace(/_/g, "/");
            const buffer = Buffer.from(base64Data, "base64");

            // Upload to ImageKit
            const imageKitFile = await imagekit.upload({
              file: buffer,
              fileName: part.filename,
              useUniqueFileName: true,
              isPrivateFile: false,
              tags: ["email-attachment"],
            });

            if (!imageKitFile.url) {
              throw new Error("No URL in ImageKit response");
            }

            attachmentUrls.push(imageKitFile.url);
            attachmentFilenames.push(part.filename);
          } catch (error) {
            console.error(
              `❌ Error processing attachment ${part.filename}:`,
              error instanceof Error ? error.message : "Unknown error"
            );
            // Optionally continue with other attachments even if one fails
            continue;
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
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      tenantEmail: tenantEmail || "",
    });
  }

  return client;
}
