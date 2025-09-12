import React, { useState } from "react";
import Image from "next/image";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import WorkerDiaryEditForm from "../edit/WorkerDiaryEditForm";
import { generateDiaryPdf } from "./DiaryPdfExport";

import type { WorkItem } from "@/types/work";

interface DiaryEntryDetailProps {
  diary: WorkDiaryWithItem;
  diaries: WorkDiaryWithItem[];
  workItems: WorkItem[];
  onEdit?: () => void;
  onClose?: () => void;
}

export default function DiaryEntryDetail({
  diary,
  diaries,
  workItems,
  onEdit,
  onClose,
}: DiaryEntryDetailProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (diary.date) {
      const d = new Date(diary.date);
      return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [localDiary, setLocalDiary] = useState<WorkDiaryWithItem>(diary);
  const [editMode, setEditMode] = useState(false);

  // Only update localDiary if diary prop changes (not on every selectedDate change)
  React.useEffect(() => {
    setLocalDiary(diary);
  }, [diary]);

  // Find diary for selectedDate, but do NOT reset localDiary if already editing
  React.useEffect(() => {
    if (!editMode) {
      const found = (diaries ?? []).find(
        (d) =>
          d.date && new Date(d.date).toISOString().slice(0, 10) === selectedDate
      );
      if (found) setLocalDiary(found);
    }
  }, [selectedDate, diaries, editMode]);

  const handleEdit = () => {
    onEdit?.();
    setEditMode(true);
  };
  const handleCancel = () => setEditMode(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (updated: Partial<WorkDiaryWithItem>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await (
        await import("@/actions/workdiary-actions")
      ).updateWorkDiary({
        id: localDiary.id === null ? 0 : localDiary.id,
        workId: localDiary.workId,
        workItemId: localDiary.workItemId ?? undefined,
        description: updated.description,
        weather: updated.weather,
        temperature: updated.temperature,
        issues: updated.issues,
        notes: updated.notes,
        unit: updated.unit,
      });
      if (res.success) {
        setLocalDiary({ ...localDiary, ...updated });
        setEditMode(false);
      } else {
        setError(res.message || "Hiba a mentéskor");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
      setError(msg || "Hiba a mentéskor");
    } finally {
      setSaving(false);
    }
  };

  if (editMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-2xl w-[90%] sm:w-full mx-auto max-h-[90dvh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Munkanapló</h2>
          <WorkerDiaryEditForm
            diary={localDiary}
            workItems={workItems}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Munka napló bejegyzés részletei</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-lg"
          >
            &times;
          </button>
        )}
      </div>
      {saving && (
        <div className="text-sm text-blue-600 mb-2">Mentés folyamatban…</div>
      )}
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="mb-3 text-sm text-gray-600">
        <b>Munkafázis:</b>
        <select
          className="border rounded px-2 py-1 ml-2"
          value={localDiary.workItemId ?? ""}
          onChange={(e) => {
            const wid = Number(e.target.value);
            const selected = workItems.find((w: WorkItem) => w.id === wid);
            setLocalDiary({
              ...localDiary,
              workItemId: wid,
              workItem: selected,
            });
          }}
        >
          {workItems.map((w: WorkItem) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <br />
        <b>Dátum:</b>{" "}
        <input
          type="date"
          className="border rounded px-2 py-1 ml-1"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setLocalDiary({ ...localDiary, date: new Date(e.target.value) });
          }}
          style={{ width: 150 }}
        />
        <b>Jelentő:</b> {diary.reportedByName || "-"}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <span className="font-semibold">Dátum:</span>{" "}
          {localDiary.date
            ? new Date(localDiary.date).toLocaleDateString()
            : "-"}
        </div>
        <div>
          <span className="font-semibold">Leírás:</span>{" "}
          {localDiary.description || "-"}
        </div>
        <div>
          <span className="font-semibold">Mennyiség:</span>{" "}
          {localDiary.quantity != null ? localDiary.quantity : "-"}
        </div>
        <div>
          <span className="font-semibold">Mennyiségi egység:</span>{" "}
          {localDiary.unit || "-"}
        </div>
        <div>
          <span className="font-semibold">Munkaóra:</span>{" "}
          {localDiary.workHours != null ? localDiary.workHours : "-"}
        </div>
        <div>
          <span className="font-semibold">Időjárás:</span>{" "}
          {localDiary.weather || "-"}
        </div>
        <div>
          <span className="font-semibold">Hőmérséklet:</span>{" "}
          {localDiary.temperature != null
            ? `${localDiary.temperature} °C`
            : "-"}
        </div>
        <div>
          <span className="font-semibold">Problémák:</span>{" "}
          {localDiary.issues || "-"}
        </div>
        <div>
          <span className="font-semibold">Jegyzetek:</span>{" "}
          {localDiary.notes || "-"}
        </div>
      </div>
      <div className="mb-2">
        <b>Jegyzetek:</b> {diary.notes || "-"}
      </div>
      <div className="mb-4">
        <b>Képek:</b>
        <div className="flex gap-2 flex-wrap mt-2">
          {diary.images && diary.images.length > 0 ? (
            diary.images.map((img, i) => (
              <Image
                key={i}
                src={img}
                alt={`img-${i}`}
                width={96}
                height={96}
                className="object-cover rounded border"
              />
            ))
          ) : (
            <span className="text-gray-400">Nincs kép</span>
          )}
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleEdit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Szerkesztés
        </button>
        <button
          onClick={async () => {
            await generateDiaryPdf(localDiary);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          PDF export
        </button>
        <button
          onClick={onClose}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
}
