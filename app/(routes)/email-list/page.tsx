"use client";
import { useEffect, useState, useTransition } from "react";
import { getAllEmails } from "../../../actions/server.action";

type Email = {
  id: number;
  gmailId: string;
  from: string;
  subject: string;
  content: string;
  hasAttachment: boolean;
  attachmentFilenames: string[];
  tenantEmail: string;
};

function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getAllEmails();
      setEmails(data);
    });
  }, []);

  if (isPending && emails.length === 0) return <div>Betöltés...</div>;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2>Kérések lista</h2>
      {emails.length === 0 ? (
        <div>Nincs beérkező ajánlata.</div>
      ) : (
        <ul style={{ width: '100%', maxWidth: 600, padding: 0, margin: 0, marginLeft: 0, listStyle: 'none' }}>
          {emails.map((email) => (
            <li
              key={email.id}
              style={{
                marginBottom: 8,
                padding: 6,
                border: "1px solid #eee",
                minHeight: 40,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                maxWidth: 600,
                width: '100%',
                background: '#fafcff',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              <span style={{ minWidth: 120, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.from}</span>
              <span style={{ minWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.subject}</span>
              <span style={{ color: '#888', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email.content.substring(0, 40)}{email.content.length > 40 ? '…' : ''}
              </span>
              {email.hasAttachment && (
                <span title="Melléklet van" style={{marginLeft: 8, color: '#0070f3', fontSize: 16, display: 'flex', alignItems: 'center', gap: 4}}>
                  📎
                  <span style={{fontSize: 12, color: '#444', marginLeft: 2}}>
                    {email.attachmentFilenames.join(', ')}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EmailList;
