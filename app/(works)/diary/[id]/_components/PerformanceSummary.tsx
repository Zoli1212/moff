'use client';

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

  const {hoursByWorker, totalRevenue, totalCost, workerPerformances, workItemPerformances, previousPeriodPerformance, performanceChange } = data;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800">Heti teljesítmény</h2>
          {/* Trend információ */}
          {performanceChange !== undefined && previousPeriodPerformance !== undefined && (
            <span className={`text-sm font-medium ${
              performanceChange > 0 
                ? 'text-green-600' 
                : performanceChange < 0 
                ? 'text-red-600' 
                : 'text-gray-600'
            }`}>
              {performanceChange > 0 && '▲'}
              {performanceChange < 0 && '▼'}
              {performanceChange === 0 && '─'}
              {performanceChange > 0 ? '+' : performanceChange < 0 ? '-' : ''}{Math.abs(performanceChange).toFixed(1)}%
            </span>
          )}
          {totalCost > 0 && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${
              totalRevenue > totalCost 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              Profitráta: {((totalRevenue / totalCost - 1) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
        {/* Középső oszlop: Munkafázis teljesítmények */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 border-b pb-1"><small>Munkafázis teljesítmények</small></h3>
          {workItemPerformances && workItemPerformances.length > 0 ? (
            <>
              {workItemPerformances
                .sort((a, b) => b.performancePercentage - a.performancePercentage)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 truncate pr-2">{item.name}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap text-xs">
                        {item.totalProgress.toLocaleString('hu-HU')} {item.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-bold text-xs px-1 py-0.5 rounded ${
                        item.performancePercentage >= 100 
                          ? 'text-green-600 bg-green-50' 
                          : item.performancePercentage > 0 
                          ? 'text-orange-600 bg-orange-50' 
                          : 'text-red-600 bg-red-50'
                      }`}>
                        {item.performancePercentage > 0 ? '+' : ''}{Math.round(item.performancePercentage)}%
                      </span>
                      {item.performanceChange !== undefined && (
                        <span className={`text-xs ${
                          item.performanceChange > 0 
                            ? 'text-green-600' 
                            : item.performanceChange < 0 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                        }`}>
                          {item.performanceChange > 0 && '▲'}
                          {item.performanceChange < 0 && '▼'}
                          {item.performanceChange === 0 && '─'}
                          {item.performanceChange > 0 ? '+' : item.performanceChange < 0 ? '-' : ''}{Math.abs(item.performanceChange).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </>
          ) : (
            <p className="text-sm text-gray-500">Nincsenek munkafázis teljesítmények.</p>
          )}
        </div>

        {/* Jobb oldali oszlop: Ledolgozott órák és teljesítmény */}
        <div className="space-y-2">
          <h6 className="font-semibold text-gray-600 border-b pb-1">
            <small>Ledolgozott órák és teljesítmények</small></h6>
          {hoursByWorker.length > 0 ? (
            <>
              {hoursByWorker
                .sort((a, b) => b.totalHours - a.totalHours)
                .map((worker, index) => {
                  // Keressük meg a munkás teljesítményét
                  const performance = workerPerformances?.find(wp => wp.name === worker.name);
                  return (
                    <div key={index} className="text-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 truncate pr-2">{worker.name}</span>
                        <span className="font-medium text-gray-900 whitespace-nowrap">
                          {worker.totalHours.toLocaleString('hu-HU')} óra
                        </span>
                      </div>
                      {performance && (
                        <div className="flex items-center gap-1">
                          <span className={`font-bold text-xs px-1 py-0.5 rounded ${
                            performance.performancePercentage >= 100 
                              ? 'text-green-600 bg-green-50' 
                              : performance.performancePercentage > 0 
                              ? 'text-orange-600 bg-orange-50' 
                              : 'text-red-600 bg-red-50'
                          }`}>
                            {performance.performancePercentage > 0 ? '+' : ''}{Math.round(performance.performancePercentage)}%
                          </span>
                          {performance.performanceChange !== undefined && (
                            <span className={`text-xs ${
                              performance.performanceChange > 0 
                                ? 'text-green-600' 
                                : performance.performanceChange < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                            }`}>
                              {performance.performanceChange > 0 && '▲'}
                              {performance.performanceChange < 0 && '▼'}
                              {performance.performanceChange === 0 && '─'}
                              {performance.performanceChange > 0 ? '+' : performance.performanceChange < 0 ? '-' : ''}{Math.abs(performance.performanceChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
      </div>

    </div>
  );
};

export default PerformanceSummary;
