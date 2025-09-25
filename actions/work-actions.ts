"use server";

import { OfferItem } from "@/lib/offer-parser";
import type { WorkItemAIResult } from "../types/work.types";
import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { revalidatePath } from "next/cache";
import util from "node:util";

export async function getUserWorks() {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const works = await prisma.work.findMany({
    where: {
      tenantEmail: tenantEmail,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return works;
}

export async function deleteWork(id: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();

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
  try {
    const rawWork = await getWorkById(workId);
    if (!rawWork) {
      throw new Error("Work not found");
    }
    const normWork = await normalizeWork(rawWork);
    const workItems = await getWorkItemsWithWorkers(workId);

    // Ellenőrizzük van-e workDiaryItem az adott munkához
    const { user, tenantEmail } = await getTenantSafeAuth();
    const workDiaryItems = await prisma.workDiaryItem.findMany({
      where: {
        workId: workId,
        tenantEmail: tenantEmail,
      },
    });

    // Ha nincs workDiaryItem, akkor minden workItem completedQuantity-ját 0-ra állítjuk
    const hasWorkDiaryItems = workDiaryItems.length > 0;

    const items = workItems.map((item: any) => ({
      ...item,
      description: item.description ?? undefined,
      // Ha nincs workDiaryItem, akkor completedQuantity = 0
      completedQuantity: hasWorkDiaryItems ? item.completedQuantity : 0,
      workItemWorkers: item.workItemWorkers?.map((w: any) => ({
        ...w,
        name: w.name ?? undefined,
        role: w.role ?? undefined,
      })),
    }));

    // Ha nincs workDiaryItem, akkor az adatbázisban is frissítjük a completedQuantity-kat 0-ra
    if (!hasWorkDiaryItems) {
      await prisma.workItem.updateMany({
        where: {
          workId: workId,
          tenantEmail: tenantEmail,
        },
        data: {
          completedQuantity: 0,
        },
      });
    }

    return { work: normWork, workItems: items };
  } catch (error) {
    console.error("Error in fetchWorkAndItems:", error);
    throw error; // Re-throw to be caught by the component
  }
}

export async function updateWorkWithAIResult(workId: number, aiResult: any) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  const email = tenantEmail;

  // --- AI result debug log ---
  console.log(
    "[AI RESULT RAW]:",
    util.inspect(aiResult, { depth: null, colors: true })
  );
  // vagy egyszerű JSON formában (BigInt-safe):
  console.log(
    "[AI RESULT JSON]:",
    JSON.stringify(
      aiResult,
      (k, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    )
  );

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
        Number(
          String(v ?? "0")
            .replace(/[^0-9.,-]/g, "")
            .replace(",", ".")
        ) || 0;

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
              out.push({
                name,
                unit: "",
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
              });
            });
          return out;
        }

        if (Array.isArray(raw)) {
          for (const m of raw) {
            if (typeof m === "string") {
              const name = m.trim();
              if (name)
                out.push({
                  name,
                  unit: "",
                  quantity: 1,
                  unitPrice: 0,
                  totalPrice: 0,
                });
              continue;
            }
            if (m && typeof m === "object") {
              const name = String(
                (m as any).type ?? (m as any).name ?? ""
              ).trim();
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

      // Kiszámítjuk a roleTotals-t EGYSZER az összes workItem alapján
      const roleTotals: Record<string, number> = {};
      for (const wi of aiResult.workItems) {
        if (Array.isArray(wi.requiredProfessionals)) {
          for (const rp of wi.requiredProfessionals) {
            const roleName = String(rp?.type || "")
              .trim()
              .toLowerCase();
            const qty = Number(rp?.quantity) || 1;
            if (!roleName || qty <= 0) continue;
            roleTotals[roleName] = (roleTotals[roleName] || 0) + qty;
          }
        }
      }

      const normalizeRole = (s: string) => s.trim().toLowerCase();

      for (const item of aiResult.workItems) {
        console.log(
          `[updateWorkWithAIResult] Creating workItem for work ${workId}:`,
          item
        );

        // 1. Létrehozzuk a WorkItem-et
        const toolList =
          typeof item.tools === "string"
            ? item.tools
                .split(/[;,]+/)
                .map((t: string) => t.trim())
                .filter(Boolean)
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
            const roleNameRaw = String(rp?.type || "").trim();
            const roleNorm = normalizeRole(roleNameRaw);
            const roleKey = roleNameRaw.toLowerCase();
            const qty = Number(rp?.quantity) || 1;
            if (!roleNameRaw || qty <= 0) continue;

            // maxRequired = a Work szintű összes mennyiség ennél a szerepkörnél
            const maxRequiredForRole = roleTotals[roleKey] ?? qty;

            // Mindig ÚJ Worker, közvetlenül a Workhöz és WorkItemhez kötve
            const newWorker = await prisma.worker.create({
              data: {
                name: roleNameRaw, // kéréseid szerint:
                role: roleNameRaw, // mindkettő rp.type
                workId: workId,
                workItemId: createdWorkItem.id,
                tenantEmail: email,
                maxRequired: maxRequiredForRole,
                hired: false,
                hoursWorked: 0,
              },
            });

            // Pivot (mennyiséggel), hogy riport és aggregáció működjön
            await prisma.workItemWorker.create({
              data: {
                tenantEmail: email,
                workItemId: createdWorkItem.id,
                workerId: newWorker.id,
                quantity: qty,
                role: roleNameRaw,
              },
            });

            await prisma.tenantWorker.upsert({
              where: {
                tenantEmail_roleNormalized: {
                  tenantEmail: email,
                  roleNormalized: roleNorm,
                },
              },
              update: {
                lastSeenAt: new Date(),
                totalAssigned: { increment: qty },
                role: roleNameRaw,
              },
              create: {
                tenantEmail: email,
                role: roleNameRaw,
                roleNormalized: roleNorm,
                totalAssigned: qty,
                lastSeenAt: new Date(),
              },
            });
            // if (Array.isArray(item.requiredProfessionals)) {
            //   for (const rp of item.requiredProfessionals) {
            //     console.log(
            //       `[updateWorkWithAIResult] Processing requiredProfessional for workItem ${createdWorkItem.id}:`,
            //       rp
            //     );
            //     // Worker létezés ellenőrzése vagy létrehozás név alapján
            //     let workerRecord = await prisma.worker.findFirst({
            //       where: { name: rp.type, tenantEmail: email },
            //     });
            //     if (!workerRecord) {
            //       console.log(`[updateWorkWithAIResult] Creating worker:`, {
            //         name: rp.type,
            //         tenantEmail: email,
            //         workId: workId,
            //         workItemId: createdWorkItem.id,
            //       });
            //       workerRecord = await prisma.worker.create({
            //         data: {
            //           name: rp.type,
            //           tenantEmail: email,
            //           workId: workId,
            //           workItemId: createdWorkItem.id,
            //         },
            //       });
            //     }
            // console.log(`[updateWorkWithAIResult] Creating workItemWorker:`, {
            //   workItemId: createdWorkItem.id,
            //   workerId: workerRecord.id,
            //   quantity: Number(rp.quantity) || 1,
            //   tenantEmail: email,
            // });
            // await prisma.workItemWorker.create({
            //   data: {
            //     workItemId: createdWorkItem.id,
            //     workerId: workerRecord.id,
            //     quantity: Number(rp.quantity) || 1,
            //     tenantEmail: email,
            //     role: rp.type,
            //     // email, name, phone opcionálisak, csak ha van érték
            //   },
            // });
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
    const workItems = await prisma.workItem.findMany({ where: { workId } });

    // totalTools számítása az aiResult.workItems alapján
    // totalTools számítása aggregáltan
    // Típusos totalTools számítás
    const totalTools = Array.isArray(aiResult.workItems)
      ? (aiResult.workItems as WorkItemAIResult[]).reduce(
          (sum: number, item: WorkItemAIResult) => {
            let toolList: string[] = [];
            if (Array.isArray(item.tools)) {
              toolList = item.tools;
            } else if (typeof item.tools === "string") {
              toolList = item.tools
                .split(/[;,]+/)
                .map((t: string) => t.trim())
                .filter(Boolean);
            }
            return sum + toolList.length;
          },
          0
        )
      : 0;

    // Segédfüggvény a szám konvertálásra (null/undefined is 0)
    const num = (v: any) =>
      typeof v === "number"
        ? v
        : Number(
            (v || "0")
              .toString()
              .replace(/[^0-9.,-]/g, "")
              .replace(",", ".")
          ) || 0;

    const totalLaborCost = workItems.reduce(
      (sum, wi) => sum + num(wi.workTotal),
      0
    );
    // totalMaterials mostantól az adatbázisból
    const totalMaterials = await prisma.material.count({ where: { workId } });
    const totalMaterialCost = workItems.reduce(
      (sum, wi) => sum + num(wi.materialTotal),
      0
    );

    const groupedByWorker = await prisma.workItemWorker.groupBy({
      by: ["workerId"],
      where: { workItem: { workId } },
      _sum: { quantity: true },
    });

    const totalWorkers =
      groupedByWorker.reduce((acc, g) => acc + (g._sum.quantity ?? 0), 0) || 0;
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
    console.error(
      "[updateWorkWithAIResult] aggregált mezők számítása/mentése hiba:",
      aggErr
    );
  }

  // Visszaadjuk a teljes frissített Work-ot, WorkItemekkel és összesített munkásokkal
  const result = await prisma.work.findUnique({
    where: { id: workId },
    include: { workItems: true },
  });
  return { success: true, data: result };
}

export async function getWorkItemsWithWorkers(workId: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();
  const email = tenantEmail;
  return prisma.workItem.findMany({
    where: {
      workId,
      tenantEmail: email,
    },
    include: {
      workItemWorkers: {
        include: {
          worker: true,
          workforceRegistry: true, // Itt kérjük le a registry adatokat
        },
      },
      tools: true,
      materials: true,
      workers: true,
      workDiaryEntries: true,
    },
  });
}

export async function getWorkById(id: number) {
  const { user, tenantEmail } = await getTenantSafeAuth();

  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      workItems: true,
      workers: true, // This includes ALL workers for this work, including general ones (workItemId = null)
      materials: true,
      tools: true,
      workDiaries: true,
      performances: true, // Include Performance table
    },
  });

  // Debug: Log all workers to see if general workers (workItemId = null) are included
  console.log(
    `[getWorkById] Total workers found for work ${id}:`,
    work?.workers?.length
  );
  console.log(
    `[getWorkById] Workers with workItemId = null:`,
    work?.workers?.filter((w) => w.workItemId === null).length
  );
  console.log(
    `[getWorkById] All workers:`,
    work?.workers?.map((w) => ({
      id: w.id,
      name: w.name,
      workItemId: w.workItemId,
    }))
  );

  // Debug: Check database directly for general workers
  const allWorkersForThisWork = await prisma.worker.findMany({
    where: { workId: id },
    select: { id: true, name: true, workItemId: true, tenantEmail: true },
  });
  console.log(
    `[getWorkById] Direct DB query - all workers for work ${id}:`,
    allWorkersForThisWork
  );
  console.log(
    `[getWorkById] Direct DB query - general workers (workItemId=null):`,
    allWorkersForThisWork.filter((w) => w.workItemId === null)
  );

  // Verify the work belongs to the user
  if (!work || work.tenantEmail !== tenantEmail) {
    throw new Error("Unauthorized");
  }

  // Get expectedProfitPercent from the first performance record
  const expectedProfitPercent = work?.performances?.[0]?.expectedProfitPercent || null;

  return {
    ...work,
    totalWorkers: work.workers.length,
    expectedProfitPercent,
  };
}

// Update WorkItem inProgress status
export async function updateWorkItemInProgress(params: {
  workItemId: number;
  inProgress: boolean;
}) {
  const { workItemId, inProgress } = params;
  const { user, tenantEmail } = await getTenantSafeAuth();
  const email = tenantEmail;

  // Verify ownership by tenantEmail
  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { tenantEmail: true, id: true, workId: true },
  });
  if (!item)
    return { success: false, message: "WorkItem nem található." } as const;
  if (item.tenantEmail !== email)
    return {
      success: false,
      message: "Nincs jogosultság a WorkItem módosításához.",
    } as const;

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: { inProgress },
  });

  // Revalidate the Tasks page so status updates immediately
  try {
    if (item?.workId) revalidatePath(`/works/tasks/${item.workId}`);
  } catch (err) {
    console.error("revalidatePath failed for /works/tasks/", item?.workId, err);
  }
  return { success: true, data: updated } as const;
}

// Update WorkItem progress percentage (0-100)
export async function updateWorkItemProgress(params: {
  workItemId: number;
  progress: number;
}) {
  const { workItemId, progress } = params;
  const { user, tenantEmail } = await getTenantSafeAuth();
  const email = tenantEmail;

  // Verify ownership by tenantEmail
  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { tenantEmail: true, id: true },
  });
  if (!item)
    return { success: false, message: "WorkItem nem található." } as const;
  if (item.tenantEmail !== email)
    return {
      success: false,
      message: "Nincs jogosultság a WorkItem módosításához.",
    } as const;

  const clamped = Math.max(
    0,
    Math.min(
      100,
      Math.round(Number.isFinite(progress) ? (progress as number) : 0)
    )
  );
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: { progress: clamped },
  });
  return { success: true, data: updated } as const;
}

// Update WorkItem completedQuantity (0..quantity) and derive progress (0..100)
export async function updateWorkItemCompletion(params: {
  workItemId: number;
  completedQuantity: number;
}) {
  const { workItemId, completedQuantity } = params;
  const { user, tenantEmail } = await getTenantSafeAuth();
  const email = tenantEmail;

  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { tenantEmail: true, quantity: true, modifiedQuantity: true, id: true, workId: true },
  });
  if (!item)
    return { success: false, message: "WorkItem nem található." } as const;
  if (item.tenantEmail !== email)
    return {
      success: false,
      message: "Nincs jogosultság a WorkItem módosításához.",
    } as const;

  // Use modifiedQuantity if available, otherwise fall back to original quantity
  const effectiveQuantity = item.modifiedQuantity ?? item.quantity ?? 0;
  const qty = Number(effectiveQuantity) || 0;
  const input = Number.isFinite(completedQuantity)
    ? (completedQuantity as number)
    : 0;
  const clampedCompleted = Math.max(0, Math.min(qty, input));
  const progress = qty > 0 ? Math.floor((clampedCompleted / qty) * 100) : 0;

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: { completedQuantity: clampedCompleted, progress },
  });
  // Revalidate the Tasks page so progress bars update immediately
  try {
    if (item?.workId) revalidatePath(`/works/tasks/${item.workId}`);
  } catch (err) {
    console.error("revalidatePath failed for /works/tasks/", item?.workId, err);
  }
  return { success: true, data: updated } as const;
}
