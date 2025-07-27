import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function WorkDetailPage() {
  const params = useSearchParams();
  const data = params.get('data');
  let parsed = null;
  try {
    parsed = data ? JSON.parse(decodeURIComponent(data)) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) return <div style={{padding:40}}>Nincs adat a munkához.</div>;

  return (
    <div style={{padding:40}}>
      <h2>Munka részletei</h2>
      <pre style={{background:'#f5f5f5',padding:20,borderRadius:8,overflow:'auto'}}>{JSON.stringify(parsed, null, 2)}

        {parsed?.id && (
          <div style={{marginTop: 16, fontWeight: 600}}>
            <span style={{color:'#888'}}>ID:</span> {parsed.id}
          </div>
        )}
      </pre>
    </div>
  );
}
