import { getWorkItemsWithWorkers } from '@/actions/work-actions';
import type { WorkItem } from '@/types/work';

export default async function WorkItemList({ workId }: { workId: number }) {
  let items: WorkItem[] = [];
  let error: string | null = null;
  try {
    items = await getWorkItemsWithWorkers(workId);
  } catch (e: any) {
    error = e?.message || 'Munkafázisok betöltési hiba';
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>;
  }

  if (!items || items.length === 0) {
    return <div className="text-gray-500">Nincs munkafázis ehhez a munkához.</div>;
  }

  // Render client-side TaskCard list for interactive napló workflow
  // @ts-expect-error Async Server Component to Client Component
  const DiaryTaskCardList = (await import('./DiaryTaskCardList')).default;
  return <DiaryTaskCardList items={items} />;

}
