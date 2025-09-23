'use client';

import React, { useState } from 'react';
import type { PerformanceData } from '@/hooks/usePerformanceData';

interface PerformanceSummaryProps {
  data: PerformanceData | null;
  isLoading: boolean;
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ data, isLoading }) => {
  const [showAllWorkItems, setShowAllWorkItems] = useState(false);
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-gray-500">
        Teljesítmény adatok betöltése...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-gray-400">
        A kiválasztott időszakban nincsenek teljesítmény adatok.
      </div>
    );
  }

  const { performancePercentage, progressByWorkItem, hoursByWorker } = data;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Heti teljesítmény</h2>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-6 relative">
          <div
            className={`h-6 rounded-full transition-all duration-300 ${
              performancePercentage >= 100 
                ? 'bg-green-500' 
                : performancePercentage > 0 
                ? 'bg-orange-500' 
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(performancePercentage, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-sm">
              {performancePercentage}%
            </span>
          </div>
        </div>
        
        {/* Performance Status Text */}
        <div className="mt-2 text-center">
          <span className={`text-sm font-medium ${
            performancePercentage >= 100 
              ? 'text-green-600' 
              : performancePercentage >= 70 
              ? 'text-yellow-600' 
              : 'text-red-600'
          }`}>
            {performancePercentage >= 100 
              ? 'Cél elérve!' 
              : performancePercentage >= 70 
              ? 'Jó teljesítmény' 
              : 'Nincs haladás'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bal oldali oszlop: Haladás */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 border-b pb-1">Haladás</h3>
          {progressByWorkItem.length > 0 ? (
            <>
              {progressByWorkItem
                .sort((a, b) => b.totalProgress - a.totalProgress)
                .slice(0, 3)
                .map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-2">{item.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {item.totalProgress.toLocaleString('hu-HU')} {item.unit}
                    </span>
                  </div>
                ))}
              {progressByWorkItem.length > 3 && (
                <button
                  onClick={() => setShowAllWorkItems(true)}
                  className="text-xs text-gray-700 hover:text-gray-900 text-center pt-1 w-full underline"
                >
                  ... és még {progressByWorkItem.length - 3} feladat
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Nincs haladás.</p>
          )}
        </div>

        {/* Jobb oldali oszlop: Munkások */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 border-b pb-1">Ledolgozott órák</h3>
          {hoursByWorker.length > 0 ? (
            <>
              {hoursByWorker
                .sort((a, b) => b.totalHours - a.totalHours)
                .slice(0, 3)
                .map((worker, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-2">{worker.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {worker.totalHours.toLocaleString('hu-HU')} óra
                    </span>
                  </div>
                ))}
              {hoursByWorker.length > 3 && (
                <button
                  onClick={() => setShowAllWorkers(true)}
                  className="text-xs text-gray-700 hover:text-gray-900 text-center pt-1 w-full underline"
                >
                  ... és még {hoursByWorker.length - 3} munkás
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Nincsenek rögzített órák.</p>
          )}
        </div>

      </div>

      {/* Modal: Összes feladat */}
      {showAllWorkItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Összes feladat</h3>
              <button
                onClick={() => setShowAllWorkItems(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {progressByWorkItem
                .sort((a, b) => b.totalProgress - a.totalProgress)
                .map((item, index) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-700 truncate pr-2">{item.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {item.totalProgress.toLocaleString('hu-HU')} {item.unit}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Összes munkás */}
      {showAllWorkers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Összes munkás</h3>
              <button
                onClick={() => setShowAllWorkers(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {hoursByWorker
                .sort((a, b) => b.totalHours - a.totalHours)
                .map((worker, index) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-700 truncate pr-2">{worker.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {worker.totalHours.toLocaleString('hu-HU')} óra
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceSummary;
