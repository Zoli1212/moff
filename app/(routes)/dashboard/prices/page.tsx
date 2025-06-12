"use client";
import React, { useState } from "react";
import { useEffect } from "react";
import {
  getPriceItems,
  addPriceItem,
  updatePriceItem,
  deletePriceItem,
} from "./actions";
import { useUser } from "@clerk/nextjs";

type PriceItem = {
  id: number;
  name: string;
  price: number;
  unit: string;
  quantity: number | null;
};

export default function PricesPage() {
  const { user } = useUser();
  const tenantEmail = user?.emailAddresses?.[0]?.emailAddress;

  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editQuantity, setEditQuantity] = useState('1');
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newQuantity, setNewQuantity] = useState('1');

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
    if (
      !newName.trim() ||
      !newPrice.trim() ||
      !newUnit.trim() 
    ) {
      setError("Minden mező kitöltése kötelező!");
      return;
    }
    try {
      await addPriceItem(
        newName,
        Number(newPrice),
        newUnit,
        Number(newQuantity),
        tenantEmail!
      );
      await fetchItems();
      setNewName("");
      setNewPrice("");
      setNewUnit("");
      setNewQuantity("");
    } catch (e) {
      setError(`Hiba történt a hozzáadáskor: ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await deletePriceItem(id);
      await fetchItems();
    } catch (e) {
      setError(`Hiba történt a törléskor ${(e as Error).message}`);
    }
  };

  const handleEdit = (item: PriceItem) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditUnit(item.unit);
    setEditQuantity(item.quantity?.toString() ?? "");
  };

  const handleSave = async (id: number) => {
  
    setError(null);
  
    if (
      !editName.trim() ||
      !editPrice.trim() ||
      !editUnit.trim() ||
      isNaN(Number(editPrice))
    ) {
      setError("Minden mező kitöltése kötelező, és az árnak számnak kell lennie!");
      return;
    }
  
    try {
      await updatePriceItem(
        id,
        editName,
        Number(editPrice),
        editUnit,
        Number(editQuantity),
        tenantEmail!
      );
      await fetchItems();
      setEditId(null);
      setEditName("");
      setEditPrice("");
      setEditUnit("");
      setEditQuantity("");
    } catch (e) {
      setError(`Hiba történt a mentéskor ${(e as Error).message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
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
          className="w-70 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
          placeholder="Mennyiségi Egység (pl. kg, db,nm2)"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
        />
        <input
          type="text"
          className="w-24 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
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
                    className="w-16 border rounded-lg px-2 py-1 mr-2"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                <input
                  type="text"
                  className="w-20 border rounded-lg px-2 py-1 mr-2"
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
                <div className="w-20 text-green-800">{item.unit}</div>
                <div className="w-30 text-right text-green-800 font-bold px-2">
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
