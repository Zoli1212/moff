import React from "react";
import MaterialSlotsSection from "../_components/MaterialSlotsSection";
import type { WorkItem } from "@/types/work";
import { getWorkById } from "@/actions/work-actions";
import type { Material } from "@/types/work";

export default async function SupplyPage({ params }: { params: Promise<{ id: string }> }) {
  const workId = Number((await params).id);
  if (!workId) return <div>Hibás workId</div>;

  let materials: Material[] = [];
  let workItems: WorkItem[] = [];
  let workName = '';
  try {
    const work = await getWorkById(workId);
    materials = work.materials || [];
    workItems = (work.workItems || []).map((item: any) => ({
      ...item,
      tools: item.tools || [],
      materials: item.materials || [],
      workers: item.workers || [],
      workItemWorkers: item.workItemWorkers || [],
    }));
    workName = work.title || '';
  } catch (e) {
    return <div>Nem sikerült betölteni az anyagokat.</div>;
  }

  return (
    <div style={{ maxWidth: 450, margin: "0 auto", padding: 0 }}>
      {/* Header with back arrow and work name */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0 6px 0', gap: 10 }}>
        <a href={`/works/${workId}`} style={{ textDecoration: 'none', color: '#222', fontSize: 22, lineHeight: 1, padding: 0, marginRight: 2 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}><path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </a>
        <span style={{ fontWeight: 700, fontSize: 22, flex: 1, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workName}</span>
        {/* Optionally add a plus or other icon here if needed */}
      </div>
      {/* Subtitle */}
     
      {/* Toggle button for Anyagok/Szerszámok */}
      <div style={{ display: 'flex', gap: 0, margin: '0 0 18px 0', alignItems: 'center', justifyContent: 'center' }}>
        <button
          style={{
            padding: '8px 30px',
            borderRadius: '22px 0 0 22px',
            border: 'none',
            background: '#e6e6e6',
            color: '#222',
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 1px 2px #eee',
            outline: 'none',
            cursor: 'pointer',
            transition: 'background .2s',
            backgroundColor: '#ddd',
            zIndex: 1
          }}
        >
          Anyagok
        </button>
        <button
          style={{
            padding: '8px 30px',
            borderRadius: '0 22px 22px 0',
            border: 'none',
            background: '#f7f7f7',
            color: '#888',
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 1px 2px #eee',
            outline: 'none',
            cursor: 'pointer',
            marginLeft: -2,
            zIndex: 0
          }}
        >
          Szerszámok
        </button>
      </div>
      <MaterialSlotsSection materials={materials} workId={workId} workItems={workItems} />
    </div>
  );
}