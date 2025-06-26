"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import { getUserWorks, deleteWork } from "@/actions/work-actions";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import TextInputDialog from "@/app/(routes)/dashboard/_components/TextInputDialog";

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

export default function OffersPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchWorks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getUserWorks();
      // Convert string dates to Date objects if needed
      const worksWithDates = data.map((work) => ({
        ...work,
        date:
          work.date instanceof Date
            ? work.date
            : new Date(work.date as unknown as string),
        createdAt:
          work.createdAt instanceof Date
            ? work.createdAt
            : new Date(work.createdAt as unknown as string),
        updatedAt:
          work.updatedAt instanceof Date
            ? work.updatedAt
            : new Date(work.updatedAt as unknown as string),
      }));
      setWorks(worksWithDates);
      setError(null);
    } catch (err) {
      console.error("Error fetching works:", err);
      setError("Hiba történt az adatok betöltése közben.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchWorks();
    })();
  }, [fetchWorks]);

  const handleDelete = useCallback(async (id: number) => {
    console.log("Delete work:", id);
    try {
      await deleteWork(id);
      // Update local state after successful deletion
      setWorks((prevWorks) => prevWorks.filter((work) => work.id !== id));
    } catch (error) {
      console.error("Error deleting work:", error);
      setError("Hiba történt a törlés közben.");
    }
  }, []);

  const trailingActions = (id: number) => {
    const handleClick = () => {
      console.log("Trailing action clicked for work:", id);
      handleDelete(id);
    };

    return (
      <TrailingActions>
        <SwipeAction onClick={handleClick}>
          <div className="flex items-center justify-center w-20 h-full bg-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </SwipeAction>
      </TrailingActions>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 overflow-x-hidden w-full h-full">
        <div className="w-full max-w-screen-lg mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Munkáim</h1>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
            role="alert"
          >
            <p>Hiba történt az adatok betöltése közben.</p>
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
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Vissza a főoldalra"
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
            <h1 className="text-2xl font-bold text-gray-800">Munkáim</h1>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="ml-auto p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Új munka hozzáadása"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <TextInputDialog
            open={isDialogOpen}
            setOpen={setIsDialogOpen}
            toolPath="/ai-tools/ai-offer-letter"
          />
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Keresés..."
              className="w-full p-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="w-full">
          <SwipeableList className="w-full">
            {works?.map((work) => (
              <SwipeableListItem
                key={work.id}
                trailingActions={trailingActions(work.id)}
                className="mb-3 w-full"
              >
                <div className="w-full">
                  <Link
                    href={`/requirements/${work.id}`}
                    className="block bg-white rounded-lg p-4 shadow-sm border border-gray-100 w-full hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {work.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(work.date), "PPP", { locale: hu })}
                        </p>
                        {work.location && work.location !== "null" && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center">
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
                      </div>
                      <div className="text-right">
                        {work.totalPrice && work.totalPrice > 0 ? (
                          <p className="font-medium text-gray-900">
                            {work.totalPrice.toLocaleString()} Ft
                          </p>
                        ) : null}
                        {work.time && (
                          <p className="text-sm text-gray-500 mt-1">
                            {work.time}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </SwipeableListItem>
            ))}
          </SwipeableList>

          {works?.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">Még nincsenek munkáid.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
