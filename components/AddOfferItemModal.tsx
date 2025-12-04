"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface AddOfferItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    quantity: string;
    unit: string;
    materialUnitPrice: string;
    unitPrice: string;
  }) => void;
}

export function AddOfferItemModal({
  isOpen,
  onClose,
  onSave,
}: AddOfferItemModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    unit: "db",
    materialUnitPrice: "0",
    unitPrice: "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "A tétel neve kötelező";
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "A mennyiség pozitív szám kell legyen";
    }

    if (!formData.unit.trim()) {
      newErrors.unit = "Az egység kötelező";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Format prices with "Ft" suffix
    const itemToSave = {
      ...formData,
      materialUnitPrice: formData.materialUnitPrice + " Ft",
      unitPrice: formData.unitPrice + " Ft",
    };

    onSave(itemToSave);

    // Reset form
    setFormData({
      name: "",
      quantity: "1",
      unit: "db",
      materialUnitPrice: "0",
      unitPrice: "0",
    });
    setErrors({});
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: "",
      quantity: "1",
      unit: "db",
      materialUnitPrice: "0",
      unitPrice: "0",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Új tétel hozzáadása
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tétel megnevezése *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="pl. Festés utáni takarítás"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mennyiség *
              </label>
              <input
                type="number"
                id="quantity"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? "border-red-500" : "border-gray-300"
                }`}
                min="0"
                step="0.01"
              />
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Egység *
              </label>
              <input
                type="text"
                id="unit"
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.unit ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="db, m², óra, stb."
              />
              {errors.unit && (
                <p className="text-red-500 text-sm mt-1">{errors.unit}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="materialUnitPrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Anyag egységár (Ft)
            </label>
            <input
              type="number"
              id="materialUnitPrice"
              value={formData.materialUnitPrice}
              onChange={(e) =>
                handleChange("materialUnitPrice", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1"
            />
          </div>

          <div>
            <label
              htmlFor="unitPrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Díj egységár (Ft)
            </label>
            <input
              type="number"
              id="unitPrice"
              value={formData.unitPrice}
              onChange={(e) => handleChange("unitPrice", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1"
            />
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-[#FF9900] border border-transparent rounded-md hover:bg-[#FF9900]/90 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              Hozzáadás
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Mégse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
