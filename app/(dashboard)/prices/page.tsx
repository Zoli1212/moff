"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { checkIsSuperUser } from "@/actions/user-management-actions";
import {
  getGlobalPrices,
  getTenantPrices,
  updateGlobalPrice,
  updateTenantPrice,
  deleteGlobalPrice,
  deleteTenantPrice,
} from "@/actions/price-list-actions";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronLeft, Plus } from "lucide-react";

interface PriceItem {
  id: number;
  task: string;
  category?: string | null;
  technology?: string | null;
  unit?: string | null;
  laborCost: number;
  materialCost: number;
}

interface EditingItem extends PriceItem {
  type: "global" | "tenant";
}

export default function PricesPage() {
  const router = useRouter();
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [globalPrices, setGlobalPrices] = useState<PriceItem[]>([]);
  const [tenantPrices, setTenantPrices] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemType, setNewItemType] = useState<"tenant" | "global" | null>(null);

  // Check super user status and load prices
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Check if super user
        const superUserResult = await checkIsSuperUser();
        setIsSuperUser(superUserResult.isSuperUser || false);

        // Load tenant prices
        const tenantResult = await getTenantPrices();
        if (tenantResult.success) {
          setTenantPrices(tenantResult.data || []);
        }

        // Load global prices if super user
        if (superUserResult.isSuperUser) {
          const globalResult = await getGlobalPrices();
          if (globalResult.success) {
            setGlobalPrices(globalResult.data || []);
          }
        }
      } catch (error) {
        console.error("Hiba az árak betöltésekor:", error);
        toast.error("Hiba az árak betöltésekor");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleEdit = (item: PriceItem, type: "global" | "tenant") => {
    setEditingItem({ ...item, type });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;

    if (
      !editingItem.task ||
      editingItem.laborCost === undefined ||
      editingItem.materialCost === undefined
    ) {
      toast.error("Kérem töltse ki az összes kötelező mezőt");
      return;
    }

    setIsSaving(true);
    try {
      const result =
        editingItem.type === "global"
          ? await updateGlobalPrice(editingItem.id, {
              task: editingItem.task,
              category: editingItem.category,
              technology: editingItem.technology,
              unit: editingItem.unit,
              laborCost: editingItem.laborCost,
              materialCost: editingItem.materialCost,
            })
          : await updateTenantPrice(editingItem.id, {
              task: editingItem.task,
              category: editingItem.category,
              technology: editingItem.technology,
              unit: editingItem.unit,
              laborCost: editingItem.laborCost,
              materialCost: editingItem.materialCost,
            });

      if (result.success) {
        toast.success("Ár sikeresen frissítve");
        setIsModalOpen(false);
        setEditingItem(null);

        // Reload prices
        const tenantResult = await getTenantPrices();
        if (tenantResult.success) {
          setTenantPrices(tenantResult.data || []);
        }

        if (isSuperUser) {
          const globalResult = await getGlobalPrices();
          if (globalResult.success) {
            setGlobalPrices(globalResult.data || []);
          }
        }
      } else {
        toast.error(result.message || "Hiba az ár frissítésekor");
      }
    } catch (error) {
      console.error("Hiba az ár frissítésekor:", error);
      toast.error("Hiba az ár frissítésekor");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTenantPrices = tenantPrices.filter((price) =>
    price.task.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGlobalPrices = globalPrices.filter((price) =>
    price.task.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number, type: "global" | "tenant") => {
    if (!confirm("Biztosan törölni szeretnéd ezt az árat?")) return;

    try {
      const result =
        type === "global"
          ? await deleteGlobalPrice(id)
          : await deleteTenantPrice(id);

      if (result.success) {
        toast.success("Ár sikeresen törölve");

        // Reload prices
        const tenantResult = await getTenantPrices();
        if (tenantResult.success) {
          setTenantPrices(tenantResult.data || []);
        }

        if (isSuperUser) {
          const globalResult = await getGlobalPrices();
          if (globalResult.success) {
            setGlobalPrices(globalResult.data || []);
          }
        }
      } else {
        toast.error(result.message || "Hiba az ár törlésekor");
      }
    } catch (error) {
      console.error("Hiba az ár törlésekor:", error);
      toast.error("Hiba az ár törlésekor");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Árak betöltése...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-colors hover:bg-gray-200"
            title="Vissza"
          >
            <ChevronLeft className="h-6 w-6 text-black" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Áraim kezelése
          </h1>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Keresés tétel alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Tenant Prices */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Vállalkozói Áraim
            </h2>
            <button
              onClick={() => {
                setNewItemType("tenant");
                setIsAddingNew(true);
              }}
              className="p-2 rounded-full border-2 transition-colors"
              style={{ borderColor: "#FE9C00", color: "#FE9C00" }}
              title="Új tétel hozzáadása"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop view - Table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Tétel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Kategória
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Technológia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Egység
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Munkaköltség
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Anyagköltség
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                      Műveletek
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTenantPrices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm ? "Nincs találat" : "Nincsenek vállalkozói Áraim"}
                      </td>
                    </tr>
                  ) : (
                    filteredTenantPrices.map((price) => (
                      <tr key={price.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {price.task}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {price.category || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {price.technology || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {price.unit || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                          {price.laborCost.toLocaleString("hu-HU")} Ft
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                          {price.materialCost.toLocaleString("hu-HU")} Ft
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(price, "tenant")}
                              className="transition-colors"
                              style={{ color: "#FE9C00" }}
                              title="Szerkesztés"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(price.id, "tenant")}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Törlés"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-3">
            {filteredTenantPrices.length === 0 ? (
              <div className="bg-white rounded-lg p-4 text-center text-gray-500">
                {searchTerm ? "Nincs találat" : "Nincsenek vállalkozói Áraim"}
              </div>
            ) : (
              filteredTenantPrices.map((price) => (
                <div
                  key={price.id}
                  className="bg-white rounded-lg shadow p-4 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {price.task}
                      </p>
                      {price.category && (
                        <p className="text-xs text-gray-600">
                          Kat: {price.category}
                        </p>
                      )}
                      {price.technology && (
                        <p className="text-xs text-gray-600">
                          Tech: {price.technology}
                        </p>
                      )}
                      {price.unit && (
                        <p className="text-xs text-gray-600">
                          Egység: {price.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(price, "tenant")}
                        className="transition-colors"
                        style={{ color: "#FE9C00" }}
                        title="Szerkesztés"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(price.id, "tenant")}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Törlés"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">
                      Munka Díj: {price.laborCost.toLocaleString("hu-HU")} Ft
                    </span>
                    <span className="text-gray-600">
                      Anyag: {price.materialCost.toLocaleString("hu-HU")} Ft
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Prices - Only for super users */}
        {isSuperUser && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Globális Árak
              </h2>
              <button
                onClick={() => {
                  setNewItemType("global");
                  setIsAddingNew(true);
                }}
                className="p-2 rounded-full border-2 transition-colors"
                style={{ borderColor: "#FE9C00", color: "#FE9C00" }}
                title="Új tétel hozzáadása"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop view - Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Tétel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Kategória
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Technológia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Egység
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                        Munka Díj
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                        Anyagköltség
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                        Műveletek
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredGlobalPrices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm ? "Nincs találat" : "Nincsenek globális Áraim"}
                        </td>
                      </tr>
                    ) : (
                      filteredGlobalPrices.map((price) => (
                        <tr key={price.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {price.task}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {price.category || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {price.technology || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {price.unit || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                            {price.laborCost.toLocaleString("hu-HU")} Ft
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                            {price.materialCost.toLocaleString("hu-HU")} Ft
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(price, "global")}
                                className="transition-colors"
                                style={{ color: "#FE9C00" }}
                                title="Szerkesztés"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(price.id, "global")}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Törlés"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile view - Cards */}
            <div className="md:hidden space-y-3">
              {filteredGlobalPrices.length === 0 ? (
                <div className="bg-white rounded-lg p-4 text-center text-gray-500">
                  {searchTerm ? "Nincs találat" : "Nincsenek globális Áraim"}
                </div>
              ) : (
                filteredGlobalPrices.map((price) => (
                  <div
                    key={price.id}
                    className="bg-white rounded-lg shadow p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {price.task}
                        </p>
                        {price.category && (
                          <p className="text-xs text-gray-600">
                            Kat: {price.category}
                          </p>
                        )}
                        {price.technology && (
                          <p className="text-xs text-gray-600">
                            Tech: {price.technology}
                          </p>
                        )}
                        {price.unit && (
                          <p className="text-xs text-gray-600">
                            Egység: {price.unit}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(price, "global")}
                          className="transition-colors"
                          style={{ color: "#FE9C00" }}
                          title="Szerkesztés"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(price.id, "global")}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">
                        Munka Díj: {price.laborCost.toLocaleString("hu-HU")} Ft
                      </span>
                      <span className="text-gray-600">
                        Anyag: {price.materialCost.toLocaleString("hu-HU")} Ft
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add New Item Modal */}
      {isAddingNew && newItemType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Új tétel hozzáadása
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tétel neve *
                </label>
                <input
                  type="text"
                  id="newTask"
                  placeholder="pl. Falazás"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategória
                </label>
                <input
                  type="text"
                  id="newCategory"
                  placeholder="pl. Szerkezetépítés"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technológia
                </label>
                <input
                  type="text"
                  id="newTechnology"
                  placeholder="pl. Téglából"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Egység *
                </label>
                <input
                  type="text"
                  id="newUnit"
                  placeholder="pl. m²"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Munka Díj (Ft) *
                </label>
                <input
                  type="number"
                  id="newLaborCost"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anyagköltség (Ft) *
                </label>
                <input
                  type="number"
                  id="newMaterialCost"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={async () => {
                  const task = (document.getElementById("newTask") as HTMLInputElement)?.value;
                  const category = (document.getElementById("newCategory") as HTMLInputElement)?.value;
                  const technology = (document.getElementById("newTechnology") as HTMLInputElement)?.value;
                  const unit = (document.getElementById("newUnit") as HTMLInputElement)?.value;
                  const laborCost = parseInt((document.getElementById("newLaborCost") as HTMLInputElement)?.value) || 0;
                  const materialCost = parseInt((document.getElementById("newMaterialCost") as HTMLInputElement)?.value) || 0;

                  if (!task || !unit || laborCost === 0 || materialCost === 0) {
                    toast.error("Kérjük, töltsd ki az összes kötelező mezőt!");
                    return;
                  }

                  setIsSaving(true);
                  try {
                    if (newItemType === "tenant") {
                      const result = await updateTenantPrice(0, {
                        task,
                        category: category || null,
                        technology: technology || null,
                        unit: unit || null,
                        laborCost,
                        materialCost,
                      });
                      if (result.success) {
                        toast.success("Új tétel sikeresen hozzáadva!");
                        setIsAddingNew(false);
                        setNewItemType(null);
                        // Reload prices
                        const pricesResult = await getTenantPrices();
                        if (pricesResult.success) {
                          setTenantPrices(pricesResult.data || []);
                        }
                      } else {
                        toast.error(result.message || "Hiba a tétel hozzáadásakor");
                      }
                    } else {
                      const result = await updateGlobalPrice(0, {
                        task,
                        category: category || null,
                        technology: technology || null,
                        unit: unit || null,
                        laborCost,
                        materialCost,
                      });
                      if (result.success) {
                        toast.success("Új tétel sikeresen hozzáadva!");
                        setIsAddingNew(false);
                        setNewItemType(null);
                        // Reload prices
                        const pricesResult = await getGlobalPrices();
                        if (pricesResult.success) {
                          setGlobalPrices(pricesResult.data || []);
                        }
                      } else {
                        toast.error(result.message || "Hiba a tétel hozzáadásakor");
                      }
                    }
                  } catch (error) {
                    console.error("Error adding price:", error);
                    toast.error("Hiba a tétel hozzáadásakor");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="w-full px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FE9C00" }}
              >
                {isSaving ? "Mentés..." : "Mentés"}
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewItemType(null);
                }}
                disabled={isSaving}
                className="w-full px-4 py-2 text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ár szerkesztése
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tétel *
                </label>
                <input
                  type="text"
                  value={editingItem.task}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, task: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategória
                </label>
                <input
                  type="text"
                  value={editingItem.category || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      category: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technológia
                </label>
                <input
                  type="text"
                  value={editingItem.technology || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      technology: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Egység
                </label>
                <input
                  type="text"
                  value={editingItem.unit || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      unit: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Munkaköltség (Ft) *
                </label>
                <input
                  type="number"
                  value={editingItem.laborCost}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      laborCost: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anyagköltség (Ft) *
                </label>
                <input
                  type="number"
                  value={editingItem.materialCost}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      materialCost: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FE9C00" }}
              >
                {isSaving ? "Mentés..." : "Mentés"}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                }}
                disabled={isSaving}
                className="w-full px-4 py-2 text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
