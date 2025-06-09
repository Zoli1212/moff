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
        <ul className="w-full max-w-[1600px] p-0 m-0 list-none">
          {emails.map((email) => (
            <li
              key={email.id}
              className="mb-2 min-h-[40px] text-[13px] flex items-stretch gap-2 max-w-[1600px] w-full"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#e6ffe6] rounded-xl shadow hover:bg-[#a3e6a3] transition-colors border border-[#eee] p-1.5 overflow-hidden">
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
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs font-medium transition-colors">Ajánlat</button>
                <button className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded text-xs font-medium transition-colors">Küld</button>
                <button className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition-colors">Töröl</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EmailList;
