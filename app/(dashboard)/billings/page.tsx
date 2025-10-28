"use client";

import { useState, useEffect } from "react";
import { getUserWorks } from "@/actions/work-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Work {
  id: number;
  title: string;
  status: string;
  updatedAt: Date | string;
  tenantEmail?: string;
  createdAt?: Date | string;
  totalPrice?: number;
  description?: string;
}

export default function BillingsPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTenant, setIsTenant] = useState<boolean>(true);

  // Check if user is tenant
  useEffect(() => {
    getCurrentUserData()
      .then((data) => {
        setIsTenant(data.isTenant ?? true);
        if (!data.isTenant) {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        setIsTenant(true);
      });
  }, [router]);

  useEffect(() => {
    if (!isTenant) return;

    const loadWorks = async () => {
      try {
        const data = await getUserWorks();
        const transformedData = data
          .map((work) => ({
            ...work,
            description: work.offerDescription || undefined,
            createdAt: work.createdAt ? new Date(work.createdAt) : new Date(0),
          }))
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        setWorks(transformedData);
      } catch (error) {
        console.error("Error loading works:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorks();
  }, [isTenant]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return "Piszkozat";
      case "sent":
        return "Elküldve";
      case "accepted":
        return "Elfogadva";
      case "rejected":
        return "Elutasítva";
      case "work":
        return "Munka";
      default:
        return status;
    }
  };

  if (!isTenant) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="w-full mx-auto px-4 max-w-7xl">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                className="text-[#FE9C00] hover:text-[#FE9C00]/80 transition-colors"
                aria-label="Vissza az irányítópultra"
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
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Számlázás</h1>
              <div className="w-8"></div>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Munkák betöltése...</p>
                </div>
              ) : works.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center">
                  <p className="text-gray-500">
                    Nincsenek munkák, amikből számlát lehetne készíteni.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {works.map((work: Work) => (
                    <Link
                      key={work.id}
                      href={`/billings/${work.id}`}
                      className="block bg-white border border-gray-200 rounded-lg transition-shadow"
                      style={{
                        boxShadow:
                          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
                      }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {work.title || "Névtelen munka"}
                            </h3>
                            {work.description && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                {work.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${work.status === "active" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                            >
                              {getStatusDisplay(work.status)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {work.totalPrice ? (
                              <span className="font-medium text-gray-900">
                                {new Intl.NumberFormat("hu-HU", {
                                  style: "currency",
                                  currency: "HUF",
                                  maximumFractionDigits: 0,
                                }).format(work.totalPrice)}
                              </span>
                            ) : (
                              <span>Ár nincs megadva</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
