"use client"
import React, { useState } from "react";

interface PriceItem {
  id: number;
  name: string;
  price: string;
  isEditing?: boolean;
}

export default function PricesPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newPrice.trim()) return;
    setItems([
      ...items,
      { id: Date.now(), name: newName, price: newPrice },
    ]);
    setNewName("");
    setNewPrice("");
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEdit = (item: PriceItem) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
  };

  const handleSave = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, name: editName, price: editPrice }
          : item
      )
    );
    setEditId(null);
    setEditName("");
    setEditPrice("");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Áraim</h1>
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
          placeholder="Tétel neve"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          type="text"
          className="w-32 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
          placeholder="Ár (Ft)"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-lg transition"
          onClick={handleAdd}
        >
          Hozzáad
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-gray-400 text-center">Nincs még tétel.</div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-3 border border-green-100 shadow"
          >
            {editId === item.id ? (
              <>
                <input
                  type="text"
                  className="flex-1 border rounded-lg px-2 py-1 mr-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="text"
                  className="w-24 border rounded-lg px-2 py-1 mr-2"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded-lg mr-1"
                  onClick={() => handleSave(item.id)}
                >
                  Mentés
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-3 py-1 rounded-lg"
                  onClick={() => setEditId(null)}
                >
                  Mégse
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 text-lg font-semibold text-green-900">
                  {item.name}
                </div>
                <div className="w-24 text-right text-green-800 font-bold">
                  {item.price} Ft
                </div>
                <button
                  className="bg-green-400 hover:bg-green-500 text-white font-bold px-3 py-1 rounded-lg mr-1"
                  onClick={() => handleEdit(item)}
                >
                  Szerkeszt
                </button>
                <button
                  className="bg-red-400 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-lg"
                  onClick={() => handleDelete(item.id)}
                >
                  Töröl
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
