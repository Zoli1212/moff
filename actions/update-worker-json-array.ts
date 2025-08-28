"use server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Updates the `workers` JSON array field of a Worker record by adding or updating a worker entry.
 * @param workerId The Worker model id
 * @param workId The parent Work id (for tenant safety)
 * @param workerData The worker object to insert/update (should include workforceRegistryId, name, email, phone, etc.)
 * @returns The updated Worker record
 */
export async function updateWorkerJsonArray({
  workerId,
  workId,
  workerData,
}: {
  workerId: number;
  workId: number;
  workerData: any;
}) {
  console.log('updateWorkerJsonArray called', { workerId, workId, workerData });
  // Tenant safety: check current user
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const userEmail = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
  if (!userEmail) throw new Error("No tenant email found");

  // Fetch the worker record and check ownership
  const worker = await prisma.worker.findFirst({
    where: {
      id: workerId,
      workId,
      work: { tenantEmail: userEmail },
    },
  });
  console.log('Found worker:', worker);
  if (!worker) throw new Error("Worker not found or access denied");

  // Parse current workers array
  let workersArr: any[] = Array.isArray(worker.workers) ? worker.workers : [];
  console.log('Old workersArr:', workersArr);

  // Find by workforceRegistryId or (name+email)
  const idx = workersArr.findIndex(w =>
    (workerData.workforceRegistryId && w.workforceRegistryId === workerData.workforceRegistryId) ||
    (w.email?.toLowerCase() === workerData.email?.toLowerCase() && w.name?.toLowerCase() === workerData.name?.toLowerCase())
  );
  console.log('Index found:', idx);

  if (idx !== -1) {
    // Update existing
    workersArr[idx] = { ...workersArr[idx], ...workerData };
  } else {
    // Before inserting, check for email uniqueness to prevent duplicates
    if (workerData.email && workersArr.some(w => w.email?.toLowerCase() === workerData.email.toLowerCase())) {
      console.log('Duplicate email found. Aborting add.');
      // Optionally, return an error or a specific status
      // For now, we just prevent the addition and return the current state
      return worker; 
    }
    // Insert new
    workersArr.push(workerData);
  }
  console.log('Updated workersArr:', workersArr);

  // Save back to DB
  const updated = await prisma.worker.update({
    where: { id: workerId },
    data: { workers: workersArr },
  });
  console.log('DB update result:', updated);
  revalidatePath('/works')
  revalidatePath('/works/' + workId);
  return updated;
}
