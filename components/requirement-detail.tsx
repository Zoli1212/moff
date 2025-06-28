"use client";

import { ArrowLeft } from "lucide-react";

interface RequirementDetailProps {
  requirement: {
    id: number;
    title: string;
    description: string | null;
    status: string;
  };
  onBack: () => void;
}

export function RequirementDetail({ requirement, onBack }: RequirementDetailProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="space-y-6 flex-grow">
        {/* Header with back button */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Vissza az ajánlathoz
          </button>
        </div>

        {/* Requirement Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {requirement.title || "Követelmény részletei"}
          </h1>
          
          <div className="mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Leírás</h2>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                {requirement.description ? (
                  <p className="text-gray-700">{requirement.description}</p>
                ) : (
                  <p className="text-gray-400 italic">Nincs leírás megadva</p>
                )}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Státusz</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {requirement.status || "Aktív"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
