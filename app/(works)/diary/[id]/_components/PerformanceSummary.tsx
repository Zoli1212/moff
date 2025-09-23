'use client';

import React from 'react';
import type { PerformanceData } from '@/hooks/usePerformanceData';

interface PerformanceSummaryProps {
  data: PerformanceData | null;
  isLoading: boolean;
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ data, isLoading }) => {
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
      <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Heti teljesítmény</h2>
        <div className="flex flex-col items-center justify-center space-y-1">
            <div className='relative w-20 h-20 flex items-center justify-center'>
                <svg className="transform -rotate-90" width="80" height="80" viewBox="0 0 36 36">
                    <circle
                        cx="18" cy="18" r="16"
                        fill="none"
                        className="stroke-current text-gray-200"
                        strokeWidth="2.5"
                    />
                    <circle
                        cx="18" cy="18" r="16"
                        fill="none"
                        className={`stroke-current ${performancePercentage >= 100 ? 'text-green-500' : performancePercentage >= 70 ? 'text-yellow-500' : 'text-red-500'}`}
                        strokeWidth="2.5"
                        strokeDasharray={`${Math.min(performancePercentage, 100)}, 100`}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-2xl font-bold text-gray-800">
                    {performancePercentage}%
                </span>
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bal oldali oszlop: Haladás */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 border-b pb-1">Haladás</h3>
          {progressByWorkItem.length > 0 ? (
            progressByWorkItem.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate pr-2">{item.name}</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  + {item.totalProgress.toLocaleString('hu-HU')} {item.unit}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Nincs haladás.</p>
          )}
        </div>

        {/* Jobb oldali oszlop: Munkások */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 border-b pb-1">Ledolgozott órák</h3>
          {hoursByWorker.length > 0 ? (
            hoursByWorker.map((worker, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate pr-2">{worker.name}</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  {worker.totalHours.toLocaleString('hu-HU')} óra
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Nincsenek rögzített órák.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default PerformanceSummary;
