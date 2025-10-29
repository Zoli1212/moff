"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { getWorkById } from "@/actions/work-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import { createBilling } from "@/actions/billing-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { BillingItems } from "./_components/BillingItems";
import { WorkItem, Tool, Material, Worker, WorkItemWorker } from "@/types/work";

// Database WorkItem type (without nested relations)
type WorkItemFromDb = Omit<
  WorkItem,
  "tools" | "materials" | "workers" | "workItemWorkers"
> & {
  tools?: Tool[] | null;
  materials?: Material[] | null;
  workers?: Worker[] | null;
  workItemWorkers?: WorkItemWorker[] | null;
};

// Extended WorkItem for billing with additional properties
interface BillingWorkItem extends WorkItem {
  isSelected?: boolean;
  billableQuantity?: number;
  totalQuantity?: number;
  billedQuantity?: number;
  paidQuantity?: number;
}

interface Work {
  id: number;
  title: string;
  status: string;
  workItems?: WorkItemFromDb[];
  totalPrice?: number;
  description?: string | null;
}

export default function BillingsDetailPage() {
  const params = useParams();
  const workId = params.workId as string;
  const router = useRouter();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTenant, setIsTenant] = useState<boolean>(true);

  const [billingItems, setBillingItems] = useState<BillingWorkItem[]>([]);

  const hasSelectedItems = useMemo(() => {
    return billingItems.some((item) => item.isSelected);
  }, [billingItems]);

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
    const fetchWork = async () => {
      try {
        setLoading(true);
        if (!workId) return;
        const data = await getWorkById(Number(workId));
        if (data) {
          const itemsWithIds =
            data.workItems?.map((item: WorkItemFromDb, index: number) => ({
              ...item,
              id: item.id ?? index,
              isSelected: false,
              billableQuantity: item.completedQuantity || 0,
              totalQuantity: item.quantity || 0,
              billedQuantity: item.billedQuantity || 0,
              paidQuantity: item.paidQuantity || 0,
              tools: item.tools || [],
              materials: item.materials || [],
              workers: item.workers || [],
              workItemWorkers: item.workItemWorkers || [],
            })) ?? [];
          setWork({ ...data, workItems: itemsWithIds });
        } else {
          setError("Munka nem található.");
        }
      } catch (err) {
        setError("Hiba történt a munka betöltésekor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [workId, isTenant]);

  useEffect(() => {
    if (work) {
      setBillingItems(
        (work.workItems || []).map((item: WorkItemFromDb) => {
          // Calculate billable quantity
          const billableQuantity = Math.max(
            0,
            (item.completedQuantity || 0) -
              ((item.billedQuantity || 0) + (item.paidQuantity || 0))
          );
          return {
            ...item,
            isSelected: billableQuantity > 0, // Auto-select if there's billable quantity
            billableQuantity: item.completedQuantity || 0,
            totalQuantity: item.quantity || 0,
            billedQuantity: item.billedQuantity || 0,
            paidQuantity: item.paidQuantity || 0,
            tools: item.tools || [],
            materials: item.materials || [],
            workers: item.workers || [],
            workItemWorkers: item.workItemWorkers || [],
          };
        })
      );
    }
  }, [work]);

  // Refresh offer data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      if (work) {
        // Refetch work data to get updated billedQuantity values
        const fetchUpdatedWork = async () => {
          try {
            const data = await getWorkById(Number(workId));
            if (data) {
              const itemsWithIds =
                data.workItems?.map((item: WorkItemFromDb, index: number) => ({
                  ...item,
                  id: item.id ?? index,
                  isSelected: false,
                  billableQuantity: item.completedQuantity || 0,
                  totalQuantity: item.quantity || 0,
                  billedQuantity: item.billedQuantity || 0,
                  tools: item.tools || [],
                  materials: item.materials || [],
                  workers: item.workers || [],
                  workItemWorkers: item.workItemWorkers || [],
                })) ?? [];
              setWork({ ...data, workItems: itemsWithIds });
            }
          } catch (err) {
            console.error("Error refreshing work:", err);
          }
        };
        fetchUpdatedWork();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [workId, work]);

  const handleCreateBilling = async () => {
    if (!work || billingItems.length === 0) return;

    const itemsForBilling = billingItems
      .filter((item) => item.isSelected)
      .map((item) => {
        // Calculate billable quantity (completed - already billed - already paid)
        const billableQuantity = Math.max(
          0,
          (item.completedQuantity || 0) -
            (item.billedQuantity || 0) -
            (item.paidQuantity || 0)
        );

        // Recalculate totals based on billable quantity
        const materialUnitPrice = item.materialUnitPrice || 0;
        const workUnitPrice = item.unitPrice || 0;
        const materialTotal = billableQuantity * materialUnitPrice;
        const workTotal = billableQuantity * workUnitPrice;

        return {
          name: item.name,
          quantity: billableQuantity,
          unit: item.unit,
          unitPrice: workUnitPrice,
          materialUnitPrice: materialUnitPrice,
          workTotal: workTotal,
          materialTotal: materialTotal,
          totalPrice: materialTotal + workTotal,
          description: item.description || undefined,
          workItemId: item.id, // ← KULCS: WorkItem ID hozzáadása
        };
      });

    try {
      const result = await createBilling({
        title: work.title,
        workId: work.id,
        items: itemsForBilling,
      });
      if (result.success) {
        router.push(`/billings/drafts/${result.billingId}`);
      } else {
        console.error("Failed to create billing:", result.error);
        // Optionally, show an error message to the user
      }
    } catch (error) {
      console.error("Error during billing creation:", error);
    }
  };

  if (!isTenant) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4 pb-24">
      <main className="flex-grow w-full mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/billings" className="p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: "#FE9C00" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-800 truncate">
            {work?.title || "Számla létrehozása"}
          </h1>
          <div className="w-8"></div>
        </div>

        {loading && <p>Betöltés...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {work && (
          <BillingItems items={billingItems} onItemsChange={setBillingItems} />
        )}

        {hasSelectedItems && (
          <>
            {/* Desktop view - bottom fixed bar */}
            <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg-top">
              <div className="max-w-7xl mx-auto flex justify-end">
                <Button onClick={handleCreateBilling} size="lg">
                  Számla létrehozása
                </Button>
              </div>
            </div>

            {/* Mobile view - floating bottom center button */}
            <div className="sm:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
              <Button
                onClick={handleCreateBilling}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg px-8 py-4 text-lg font-semibold rounded-full"
              >
                Számla létrehozása
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
