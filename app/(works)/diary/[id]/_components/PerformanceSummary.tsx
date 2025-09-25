'use client';

import type { PerformanceData } from '@/hooks/usePerformanceData';

interface PerformanceSummaryProps {
  data: PerformanceData | null;
  isLoading: boolean;
  expectedProfitPercent?: number | null;
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ data, isLoading, expectedProfitPercent }) => {

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

  const { performancePercentage, progressByWorkItem, hoursByWorker, totalRevenue, totalCost } = data;

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
            style={{ width: `${Math.max(5, Math.min(performancePercentage, 100))}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-sm">
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
            <>
              {progressByWorkItem
                .sort((a, b) => b.totalProgress - a.totalProgress)
                .map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-2">{item.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {item.totalProgress.toLocaleString('hu-HU')} {item.unit}
                    </span>
                  </div>
                ))}
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
                .map((worker, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-2">{worker.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {worker.totalHours.toLocaleString('hu-HU')} óra
                    </span>
                  </div>
                ))}
            </>
          ) : (
            <p className="text-sm text-gray-500">Nincsenek rögzített órák.</p>
          )}
        </div>

      </div>

      {/* Profitráta számítás */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-600 mb-3">Profitráta elemzés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-medium">Bevétel</div>
            <div className="text-lg font-bold text-blue-800">
              {totalRevenue.toLocaleString('hu-HU')} Ft
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 font-medium">Költség</div>
            <div className="text-lg font-bold text-red-800">
              {totalCost.toLocaleString('hu-HU')} Ft
            </div>
          </div>
          <div className={`p-3 rounded-lg ${
            totalRevenue > totalCost ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            <div className={`font-medium ${
              totalRevenue > totalCost ? 'text-green-600' : 'text-orange-600'
            }`}>
              Profit
            </div>
            <div className={`text-lg font-bold ${
              totalRevenue > totalCost ? 'text-green-800' : 'text-orange-800'
            }`}>
              {(totalRevenue - totalCost).toLocaleString('hu-HU')} Ft
            </div>
          </div>
        </div>
        
        {totalCost > 0 && (
          <div className="mt-3 text-xs text-gray-600">
            Aktuális profitráta: {((totalRevenue / totalCost - 1) * 100).toFixed(1)}%
            {expectedProfitPercent && (
              <span className="ml-3 text-green-600">
                | Cél profitráta: {expectedProfitPercent}%
              </span>
            )}
            {totalRevenue <= totalCost && (
              <span className="text-red-600 ml-2">⚠️ Veszteséges</span>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PerformanceSummary;
