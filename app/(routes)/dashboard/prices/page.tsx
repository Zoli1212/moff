"use client";
import React, { useState } from "react";
import { useEffect } from "react";
import {
  getPriceItems,
  addPriceItem,
  updatePriceItem,
  deletePriceItem,
} from "./actions";

type PriceItem = {
  id: number;
  name: string;
  price: string;
};

export default function PricesPage() {
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const [items, setItems] = useState<PriceItem[]>([]);

  // Betöltés
  const fetchItems = async () => {
    const data = await getPriceItems();
    setItems(data);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line
  }, []);

  const handleAdd = async () => {
    setError(null);
    if (!newName.trim() || !newPrice.trim()) {
      setError("Mindkét mező kitöltése kötelező!");
      return;
    }
    try {
      await addPriceItem(newName, newPrice);
      await fetchItems();
      setNewName("");
      setNewPrice("");
    } catch (e) {
      setError("Hiba történt a hozzáadáskor.");
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await deletePriceItem(id);
      await fetchItems();
    } catch (e) {
      setError("Hiba történt a törléskor.");
    }
  };

  const handleEdit = (item: PriceItem) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
  };

  const handleSave = async (id: number) => {
    setError(null);
    try {
      await updatePriceItem(id, editName, editPrice);
      await fetchItems();
      setEditId(null);
      setEditName("");
      setEditPrice("");
    } catch (e) {
      setError("Hiba történt a mentéskor.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Áraim</h1>
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-center">
          {error}
        </div>
      )}
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
