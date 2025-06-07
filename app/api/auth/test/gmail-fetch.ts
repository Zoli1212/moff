import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Lekérdezi az első 10 email ID-t
export async function listEmails(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 10,
  });

  return res.data.messages || [];
}

// Lekérdezi egy email részleteit
export async function getEmail(auth: OAuth2Client, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return res.data;
}
