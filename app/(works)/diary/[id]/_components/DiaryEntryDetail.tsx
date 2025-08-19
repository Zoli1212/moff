import React, { useState } from "react";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import WorkerDiaryEditForm from "../edit/WorkerDiaryEditForm";
import { generateDiaryPdf } from "./DiaryPdfExport";

interface DiaryEntryDetailProps {
  diary: WorkDiaryWithItem;
  diaries: WorkDiaryWithItem[];
  onEdit?: () => void;
  onClose?: () => void;
}

export default function DiaryEntryDetail({
  diary,
  diaries,
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
      const found = diaries.find(
        (d) =>
          d.date && new Date(d.date).toISOString().slice(0, 10) === selectedDate
      );
      if (found) setLocalDiary(found);
    }
  }, [selectedDate, diaries, editMode]);

const handleEdit = () => setEditMode(true);  const handleCancel = () => setEditMode(false);
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
        workItemId: localDiary.workItemId,
        description: updated.description,
        weather: updated.weather,
        temperature: updated.temperature,
        progress: updated.progress,
        issues: updated.issues,
        notes: updated.notes,
      });
      if (res.success) {
        setLocalDiary({ ...localDiary, ...updated });
        setEditMode(false);
      } else {
        setError(res.message || "Hiba a mentéskor");
      }
    } catch (e: any) {
      setError(e?.message || "Hiba a mentéskor");
    } finally {
      setSaving(false);
    }
  };

  if (editMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-bold mb-6">Munkanapló</h2>
          <WorkerDiaryEditForm
            diary={localDiary}
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
      <div className="mb-3 text-sm text-gray-600">
        <b>Munkafázis:</b> {diary.workItem?.name || "-"} <br />
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
      <div className="mb-4">
        <b>Leírás:</b>
        <div className="bg-gray-50 rounded p-2 mt-1 whitespace-pre-line">
          {diary.description || "-"}
        </div>
      </div>
      <div className="mb-2">
        <b>Időjárás:</b> {diary.weather || "-"} <br />
        <b>Hőmérséklet:</b>{" "}
        {diary.temperature != null ? `${diary.temperature} °C` : "-"}
      </div>
      <div className="mb-2">
        <b>Előrehaladás:</b>{" "}
        {diary.progress != null ? `${diary.progress}%` : "-"}
      </div>
      <div className="mb-2">
        <b>Problémák:</b> {diary.issues || "-"}
      </div>
      <div className="mb-2">
        <b>Jegyzetek:</b> {diary.notes || "-"}
      </div>
      <div className="mb-4">
        <b>Képek:</b>
        <div className="flex gap-2 flex-wrap mt-2">
          {diary.images && diary.images.length > 0 ? (
            diary.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`img-${i}`}
                className="w-24 h-24 object-cover rounded border"
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
