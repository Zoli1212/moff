import { WorkDiary } from '@/types/work-diary';
import WorkItemList from './WorkItemList';
// import { getWorkById } from '@/utils/work-utils'; // Only if needed for work title, etc.
import { notFound } from 'next/navigation';
import { getWorkDiariesByWorkId, WorkDiaryWithItem } from '@/actions/get-workdiariesbyworkid-actions';

interface DiaryPageProps {
  params: { id: string };
}


export default async function DiaryPage({ params }: DiaryPageProps) {
  const workId = Number(params.id);
  if (!workId) return notFound();

  let diaries: WorkDiaryWithItem[] = [];
  let error: string | null = null;
  try {
    diaries = await getWorkDiariesByWorkId(workId);
  } catch (e: any) {
    error = e?.message || 'Napló betöltési hiba';
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Munkanapló</h1>
      {error && <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>}
      {(!diaries || diaries.length === 0) ? (
        <WorkItemList workId={workId} />
      ) : (
        <div className="space-y-6">
          {diaries.map((d) => (
            <div key={d.id} className="bg-white rounded shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg">{d.description}</span>
                <span className="text-sm text-gray-400">{new Date(d.date).toLocaleDateString('hu-HU')}</span>
              </div>
              {d.workItem && (
                <div className="mb-2 text-sm text-blue-700">
                  <span className="font-semibold">Munkafázis: </span>
                  <span>{d.workItem.name}</span>
                  {d.workItem.description && (
                    <span className="ml-2 text-gray-500">({d.workItem.description})</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm mb-2">
                {d.weather && <span>Időjárás: {d.weather}</span>}
                {typeof d.temperature === 'number' && <span>Hőmérséklet: {d.temperature}°C</span>}
                {typeof d.progress === 'number' && <span>Előrehaladás: {d.progress}%</span>}
                {d.reportedByName && <span>Rögzítette: {d.reportedByName}</span>}
              </div>
              {d.issues && <div className="text-red-600 mb-1">Problémák: {d.issues}</div>}
              {d.notes && <div className="mb-1">Jegyzet: {d.notes}</div>}
              {d.images && d.images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {d.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Napló kép" className="w-24 h-24 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
