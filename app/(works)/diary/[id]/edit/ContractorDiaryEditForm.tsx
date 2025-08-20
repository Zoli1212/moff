import React, { useState } from "react";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

interface ContractorDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

export default function ContractorDiaryEditForm({ diary, onSave, onCancel }: ContractorDiaryEditFormProps) {
  const [description, setDescription] = useState(diary.description || "");
  const [weather, setWeather] = useState(diary.weather || "");
  const [temperature, setTemperature] = useState(diary.temperature ?? "");
  const [quantity, setQuantity] = useState(diary.quantity ?? "");
  const [issues, setIssues] = useState(diary.issues || "");
  const [notes, setNotes] = useState(diary.notes || "");
  const [unit, setUnit] = useState(diary.unit || "");
  const [workHours, setWorkHours] = useState(diary.workHours ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...diary,
      description,
      weather,
      temperature: temperature === "" ? null : Number(temperature),
      quantity: quantity === "" ? null : Number(quantity),
      issues,
      notes,
      unit: unit || null,
      workHours: workHours === "" ? null : Number(workHours),
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">Leírás</label>
        <textarea className="w-full border rounded p-2" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      </div>
      <div>
        <label className="block font-medium">Időjárás</label>
        <input className="w-full border rounded p-2" value={weather} onChange={e => setWeather(e.target.value)} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-medium">Hőmérséklet (°C)</label>
          <input type="number" className="w-full border rounded p-2" value={temperature} onChange={e => setTemperature(e.target.value)} />
        </div>
        <div>
        <label className="block font-medium">Mennyiség</label>
        <input type="number" className="w-full border rounded p-2" value={quantity} onChange={e => setQuantity(e.target.value)} min={0} step={0.01} />
      </div>
      </div>
      <div>
        <label className="block font-medium">Mennyiségi egység</label>
        <input className="w-full border rounded p-2" value={unit} onChange={e => setUnit(e.target.value)} placeholder="pl. m², fm, db" />
      </div>
      <div>
        <label className="block font-medium">Munkaóra</label>
        <input type="number" className="w-full border rounded p-2" value={workHours} onChange={e => setWorkHours(e.target.value)} min={0} step={0.1} />
      </div>
      <div>
        <label className="block font-medium">Problémák</label>
        <textarea className="w-full border rounded p-2" value={issues} onChange={e => setIssues(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="block font-medium">Jegyzetek</label>
        <textarea className="w-full border rounded p-2" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-4 mt-6">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Mentés</button>
        <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400" onClick={onCancel}>Mégsem</button>
      </div>
    </form>
  );
}
