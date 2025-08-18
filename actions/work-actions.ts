"use server";

import { OfferItem } from "@/lib/offer-parser";
import type { WorkItemAIResult } from "../types/work.types";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getUserWorks() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const emailId =
    user.emailAddresses[0].emailAddress ||
    user.primaryEmailAddress?.emailAddress;

  const works = await prisma.work.findMany({
    where: {
      tenantEmail: emailId,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return works;
}

export async function deleteWork(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Verify the work belongs to the user
  const work = await prisma.work.findUnique({
    where: { id },
    select: {
      tenantEmail: true,
      workItems: {
        select: { id: true },
      },
    },
  });

  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error("Unauthorized");
  }

  // Get all workItem IDs for this work

  // Soft delete: set isActive to false
  await prisma.work.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}




// --- ÚJ: AI válasz szerinti mentés ---
import { normalizeWork } from "@/lib/normalize";

export async function fetchWorkAndItems(workId: number) {
  const rawWork = await getWorkById(workId);
  const normWork = normalizeWork(rawWork);
  const items = (await getWorkItemsWithWorkers(workId)).map((item: any) => ({
    ...item,
    description: item.description ?? undefined,
    workItemWorkers: item.workItemWorkers?.map((w: any) => ({
      ...w,
      name: w.name ?? undefined,
      role: w.role ?? undefined,
    })),
  }));
  return { work: normWork, workItems: items };
}

export async function updateWorkWithAIResult(workId: number, aiResult: any) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const email =
    user.emailAddresses[0]?.emailAddress ||
    user.primaryEmailAddress?.emailAddress;

  // Ellenőrzés, hogy a work a felhasználóhoz tartozik
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { tenantEmail: true },
  });
  if (!work) {
    console.error(`[updateWorkWithAIResult] Work not found for id: ${workId}`);
    return { success: false, error: `Work not found for id: ${workId}` };
  }
  if (work.tenantEmail !== email) {
    console.error(
      `[updateWorkWithAIResult] Unauthorized: user ${email} does not own work ${workId}`
    );
    return {
      success: false,
      error: "Unauthorized: user does not own this work",
    };
  }

  // Work mezők frissítése

  let updatedWork = null;

  try {
    console.log(`[updateWorkWithAIResult] Updating work ${workId} with:`, {
      location: aiResult.location,
      totalWorkers: aiResult.totalWorkers,
      totalLaborCost: aiResult.totalLaborCost,
      totalTools: Array.isArray(aiResult.totalTools)
        ? aiResult.totalTools.length
        : Number(aiResult.totalTools) || 0,
      totalToolCost: aiResult.totalToolCost,
      totalMaterials: Array.isArray(aiResult.totalMaterials)
        ? aiResult.totalMaterials.length
        : Number(aiResult.totalMaterials) || 0,
      totalMaterialCost: aiResult.totalMaterialCost,
      estimatedDuration: aiResult.estimatedDuration,
      // bármi egyéb mező, amit az AI visszaad
    });
    updatedWork = await prisma.work.update({
      where: { id: workId },
      data: {
        location: aiResult.location,
        totalWorkers: aiResult.totalWorkers,
        totalLaborCost: aiResult.totalLaborCost,
        totalTools: Array.isArray(aiResult.totalTools)
          ? aiResult.totalTools.length
          : Number(aiResult.totalTools) || 0,
        totalToolCost: aiResult.totalToolCost,
        totalMaterials: Array.isArray(aiResult.totalMaterials)
          ? aiResult.totalMaterials.length
          : Number(aiResult.totalMaterials) || 0,
        totalMaterialCost: aiResult.totalMaterialCost,
        estimatedDuration: aiResult.estimatedDuration,
        updatedByAI: true,
        // bármi egyéb mező, amit az AI visszaad
      },
      include: { workItems: true },
    });
  } catch (err) {
    console.error(`[updateWorkWithAIResult] Failed to update Work:`, err);
    return {
      success: false,
      error: "Failed to update Work",
      details: err instanceof Error ? err.message : String(err),
    };
  }

  // WorkItemek upsertelése (létező törlés, új beszúrás)
  // try {
  //   await prisma.workItem.deleteMany({ where: { workId } });
  //   if (Array.isArray(aiResult.workItems)) {
  //     for (const item of aiResult.workItems) {
  //       console.log(
  //         `[updateWorkWithAIResult] Creating workItem for work ${workId}:`,
  //         item
  //       );
  //       // 1. Létrehozzuk a WorkItem-et
  //       const toolList = typeof item.tools === "string"
  //         ? item.tools.split(/[;,]+/).map((t: string) => t.trim()).filter(Boolean)
  //         : Array.isArray(item.tools)
  //           ? item.tools
  //           : [];

  //       const materialList = typeof item.materials === "string"
  //         ? item.materials.split(/[;,]+/).map((t: string) => t.trim()).filter(Boolean)
  //         : Array.isArray(item.materials)
  //           ? item.materials
  //           : [];

  //       const createdWorkItem = await prisma.workItem.create({
  //         data: {
  //           workId,
  //           name: item.name,
  //           description: item.description,
  //           quantity: Number(item.quantity) || 1,
  //           unit: item.unit || "",
  //           unitPrice: Number((item.unitPrice || "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0,
  //           materialUnitPrice: Number((item.materialUnitPrice || "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0,
  //           workTotal: Number((item.workTotal || "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0,
  //           materialTotal: Number((item.materialTotal || "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0,
  //           totalPrice: Number((item.totalPrice || "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0,
  //           tenantEmail: email,
  //           tools: {
  //             create: toolList.map((name: string) => ({
  //               name,
  //               workId,
  //               workItemId: undefined, // will be set by Prisma after create
  //               tenantEmail: email,
  //             })),
  //           },
  //           materials: {
  //             create: materialList.map((name: string) => ({
  //               name,
  //               workId,
  //               unit: "",
  //               unitPrice: 0,
  //               totalPrice: 0,
  //               quantity: 1,
  //               workItemId: undefined, // will be set by Prisma after create
  //               tenantEmail: email,
  //             })),
  //           },
  //         },
  //       });
  //       // 2. Minden requiredProfessional-t mentünk a pivot táblába
  //       if (Array.isArray(item.requiredProfessionals)) {
  //         for (const rp of item.requiredProfessionals) {
  //           console.log(
  //             `[updateWorkWithAIResult] Processing requiredProfessional for workItem ${createdWorkItem.id}:`,
  //             rp
  //           );
  //           // Worker létezés ellenőrzése vagy létrehozás név alapján
  //           let workerRecord = await prisma.worker.findFirst({
  //             where: { name: rp.type, tenantEmail: email },
  //           });
  //           if (!workerRecord) {
  //             console.log(`[updateWorkWithAIResult] Creating worker:`, {
  //               name: rp.type,
  //               tenantEmail: email,
  //               workId: workId,
  //               workItemId: createdWorkItem.id,
  //             });
  //             workerRecord = await prisma.worker.create({
  //               data: {
  //                 name: rp.type,
  //                 tenantEmail: email,
  //                 workId: workId,
  //                 workItemId: createdWorkItem.id,
  //               },
  //             });
  //           }
  //           console.log(`[updateWorkWithAIResult] Creating workItemWorker:`, {
  //             workItemId: createdWorkItem.id,
  //             workerId: workerRecord.id,
  //             quantity: Number(rp.quantity) || 1,
  //             tenantEmail: email,
  //           });
  //           await prisma.workItemWorker.create({
  //             data: {
  //               workItemId: createdWorkItem.id,
  //               workerId: workerRecord.id,
  //               quantity: Number(rp.quantity) || 1,
  //               tenantEmail: email,
  //               role: rp.type,
  //               // email, name, phone opcionálisak, csak ha van érték
          
  //             },
  //           });
  //         }
  //       }
  //     }
  //   }
  // } catch (err) {
  //   console.error(`[updateWorkWithAIResult] Failed to create WorkItems:`, err);
  //   return {
  //     success: false,
  //     error: "Failed to create WorkItems",
  //     details: err instanceof Error ? err.message : String(err),
  //   };
  // }

  try {
    await prisma.workItem.deleteMany({ where: { workId } });
    if (Array.isArray(aiResult.workItems)) {
      // --- segédfüggvények ---
      const toNum = (v: unknown) =>
        Number(String(v ?? "0").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
  
      const normalizeMaterials = (raw: unknown) => {
        const out: Array<{
          name: string;
          unit: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }> = [];
  
        if (!raw) return out;
  
        if (typeof raw === "string") {
          raw
            .split(/[;,]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((name) => {
              out.push({ name, unit: "", quantity: 1, unitPrice: 0, totalPrice: 0 });
            });
          return out;
        }
  
        if (Array.isArray(raw)) {
          for (const m of raw) {
            if (typeof m === "string") {
              const name = m.trim();
              if (name) out.push({ name, unit: "", quantity: 1, unitPrice: 0, totalPrice: 0 });
              continue;
            }
            if (m && typeof m === "object") {
              const name = String((m as any).type ?? (m as any).name ?? "").trim();
              if (!name) continue;
              out.push({
                name,
                unit: String((m as any).unit ?? ""),
                quantity: Number((m as any).quantity) || 1,
                unitPrice: toNum((m as any).unitPrice),
                totalPrice: toNum((m as any).totalPrice),
              });
            }
          }
        }
  
        return out;
      };
      // --- /segédfüggvények ---
  
      for (const item of aiResult.workItems) {
        console.log(
          `[updateWorkWithAIResult] Creating workItem for work ${workId}:`,
          item
        );
  
        // 1. Létrehozzuk a WorkItem-et
        const toolList = typeof item.tools === "string"
          ? item.tools.split(/[;,]+/).map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(item.tools)
            ? item.tools
            : [];
  
        // <<< EZ AZ EGYETLEN VÁLTOZÁS A MATERIALS-RE: >>>
        const materialList = normalizeMaterials(item.materials);
  
        const createdWorkItem = await prisma.workItem.create({
          data: {
            workId,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || "",
            unitPrice: toNum(item.unitPrice || "0"),
            materialUnitPrice: toNum(item.materialUnitPrice || "0"),
            workTotal: toNum(item.workTotal || "0"),
            materialTotal: toNum(item.materialTotal || "0"),
            totalPrice: toNum(item.totalPrice || "0"),
            tenantEmail: email,
            tools: {
              create: toolList.map((name: string) => ({
                name,
                workId,
                workItemId: undefined, // will be set by Prisma after create
                tenantEmail: email,
              })),
            },
            materials: {
              create: materialList.map((m) => ({
                name: m.name,
                workId,
                unit: m.unit,
                unitPrice: m.unitPrice,
                totalPrice: m.totalPrice,
                quantity: m.quantity,
                workItemId: undefined, // will be set by Prisma after create
                tenantEmail: email,
              })),
            },
          },
        });
  
        // 2. Minden requiredProfessional-t mentünk a pivot táblába
        if (Array.isArray(item.requiredProfessionals)) {
          for (const rp of item.requiredProfessionals) {
            console.log(
              `[updateWorkWithAIResult] Processing requiredProfessional for workItem ${createdWorkItem.id}:`,
              rp
            );
            // Worker létezés ellenőrzése vagy létrehozás név alapján
            let workerRecord = await prisma.worker.findFirst({
              where: { name: rp.type, tenantEmail: email },
            });
            if (!workerRecord) {
              console.log(`[updateWorkWithAIResult] Creating worker:`, {
                name: rp.type,
                tenantEmail: email,
                workId: workId,
                workItemId: createdWorkItem.id,
              });
              workerRecord = await prisma.worker.create({
                data: {
                  name: rp.type,
                  tenantEmail: email,
                  workId: workId,
                  workItemId: createdWorkItem.id,
                },
              });
            }
            console.log(`[updateWorkWithAIResult] Creating workItemWorker:`, {
              workItemId: createdWorkItem.id,
              workerId: workerRecord.id,
              quantity: Number(rp.quantity) || 1,
              tenantEmail: email,
            });
            await prisma.workItemWorker.create({
              data: {
                workItemId: createdWorkItem.id,
                workerId: workerRecord.id,
                quantity: Number(rp.quantity) || 1,
                tenantEmail: email,
                role: rp.type,
                // email, name, phone opcionálisak, csak ha van érték
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[updateWorkWithAIResult] Failed to create WorkItems:`, err);
    return {
      success: false,
      error: "Failed to create WorkItems",
      details: err instanceof Error ? err.message : String(err),
    };
  }
  

  // Összesítjük a munkásokat a Work-hoz (típus+mennyiség)

  // --- Összes aggregációs mező automatikus számítása és mentése ---
  try {
    const [workItems, workers] = await Promise.all([
      prisma.workItem.findMany({ where: { workId } }),
      prisma.worker.findMany({ where: { workId } }),
    ]);

    // totalTools számítása az aiResult.workItems alapján
    // totalTools számítása aggregáltan
    // Típusos totalTools számítás
    const totalTools = Array.isArray(aiResult.workItems)
      ? (aiResult.workItems as WorkItemAIResult[]).reduce((sum: number, item: WorkItemAIResult) => {
          let toolList: string[] = [];
          if (Array.isArray(item.tools)) {
            toolList = item.tools;
          } else if (typeof item.tools === 'string') {
            toolList = item.tools.split(/[;,]+/).map((t: string) => t.trim()).filter(Boolean);
          }
          return sum + toolList.length;
        }, 0)
      : 0;

    // Segédfüggvény a szám konvertálásra (null/undefined is 0)
    const num = (v: any) => typeof v === 'number' ? v : Number((v || "0").toString().replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;

    const totalWorkers = workers.length;
    const totalLaborCost = workItems.reduce((sum, wi) => sum + num(wi.workTotal), 0);
    // totalMaterials mostantól az adatbázisból
    const totalMaterials = await prisma.material.count({ where: { workId } });
    const totalMaterialCost = workItems.reduce((sum, wi) => sum + num(wi.materialTotal), 0);

    await prisma.work.update({
      where: { id: workId },
      data: {
        totalWorkers,
        totalLaborCost,
        totalMaterials,
        totalMaterialCost,
        totalTools,
      },
    });
  } catch (aggErr) {
    console.error('[updateWorkWithAIResult] aggregált mezők számítása/mentése hiba:', aggErr);
  }

  // Visszaadjuk a teljes frissített Work-ot, WorkItemekkel és összesített munkásokkal
  const result = await prisma.work.findUnique({
    where: { id: workId },
    include: { workItems: true },
  });
  return { success: true, data: result };
}

export async function getWorkItemsWithWorkers(workId: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Lekéri a workId-hoz tartozó összes WorkItem-et és a hozzájuk tartozó WorkItemWorker-t
  const email = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
return prisma.workItem.findMany({
  where: {
    workId,
    tenantEmail: email
  },
  include: {
    workItemWorkers: true,
    tools: true,
    materials: true,
    workers: true,
    workDiaryEntries: true,
  },
});
}

export async function getWorkById(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      workItems: true,
      workers: true,
      materials: true,
      tools: true,
      workDiaries: true,
    },
  });

  // Verify the work belongs to the user
  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error("Unauthorized");
  }

  return {
    ...work,
    totalWorkers: work.workers.length,
  };
}
