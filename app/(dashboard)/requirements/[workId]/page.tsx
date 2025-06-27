'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getWorkById } from '@/actions/work-actions';
import { getRequirementsByWorkId, RequirementWithOffers } from '@/actions/requirement-actions';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import Link from 'next/link';


interface Work {
  id: number;
  title: string;
  date: Date;
  location?: string | null;
  time?: string | null;
  totalPrice?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  tenantEmail: string;
  createdAt: Date;
  updatedAt: Date;
  workflowId?: number | null;
}

export default function WorkRequirementsPage() {
  const router = useRouter();
  const params = useParams();
  const workId = Number(params.workId);
  
  const [work, setWork] = useState<Work | null>(null);
  const [requirements, setRequirements] = useState<RequirementWithOffers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [workData, requirementsData] = await Promise.all([
          getWorkById(workId),
          getRequirementsByWorkId(workId)
        ]);
        setWork(workData);
        setRequirements(requirementsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Hiba történt az adatok betöltése közben.');
      } finally {
        setIsLoading(false);
      }
    };

    if (workId) {
      fetchData();
    }
  }, [workId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-white rounded-lg mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p>{error || 'A munka nem található'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <div className="w-full mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Vissza"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7" 
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Követelmények</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{work.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(work.date), 'PPP', { locale: hu })}
              {work.time && ` • ${work.time}`}
            </p>
            
            {work.location && work.location !== 'null' && (
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <svg
                  className="h-4 w-4 mr-1 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {work.location}
              </p>
            )}

            {work.customerName && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">Ügyfél adatai:</h3>
                <p className="text-sm text-gray-600">{work.customerName}</p>
                {work.customerPhone && (
                  <p className="text-sm text-gray-600">Telefonszám: {work.customerPhone}</p>
                )}
                {work.customerEmail && (
                  <p className="text-sm text-gray-600">Email: {work.customerEmail}</p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Követelmények</h3>
              <button
                onClick={() => router.push(`/requirements/${workId}/new`)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Új követelmény
              </button>
            </div>
            
            {requirements.length === 0 ? (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">Még nincsenek követelmények. Kattints az -Új követelmény- gombra a létrehozáshoz.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requirements.map((requirement) => (
                  <Link 
                    key={requirement.id} 
                    href={`/jobs/${requirement.id}`}
                    className="block bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{requirement.title}</h4>
                        {requirement.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {requirement.description.length > 100 
                              ? `${requirement.description.substring(0, 100)}...` 
                              : requirement.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>Létrehozva: {format(new Date(requirement.createdAt), 'PPP', { locale: hu })}</span>
                          <span className="mx-2">•</span>
                          <span>{requirement._count.offers} ajánlat</span>
                        </div>
                      </div>
                      <div className="ml-4 text-blue-600">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
