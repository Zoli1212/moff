"use client";

import { useState, useEffect } from "react";
import { getBillings } from "@/actions/billing-actions";
import Link from "next/link";
import { ArrowLeft } from 'lucide-react';
import { Billing } from '@prisma/client';

export default function MyInvoicesPage() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBillings = async () => {
      try {
        const data = await getBillings();
        setBillings(data as Billing[]);
      } catch (error) {
        console.error("Error loading billings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillings();
  }, []);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return "Piszkozat";
      case "issued":
        return "Kiállítva";
      case "paid":
        return "Fizetve";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="p-2">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Számláim</h1>
            <div className="w-8"></div>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : billings.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center">
              <p className="text-gray-500">Nincsenek kiállított számlák.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {billings.map((billing) => (
                <div key={billing.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-900">Számla #{billing.id}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                      {getStatusDisplay(billing.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {new Date(billing.createdAt).toLocaleDateString('hu-HU')}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {new Intl.NumberFormat("hu-HU", {
                        style: "currency",
                        currency: "HUF",
                        maximumFractionDigits: 0,
                      }).format(billing.totalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
