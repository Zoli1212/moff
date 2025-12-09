"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { addRAGContext } from "./rag-context-actions";

// Automatikus RAG szinkronizáció egy munkához
export async function autoSyncWorkToRAG(workId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    
    // Munka lekérése minden kapcsolódó adattal
    const work = await prisma.work.findUnique({
      where: { id: workId, tenantEmail },
      include: {
        workItems: {
          include: {
            workItemWorkers: {
              include: {
                workforceRegistry: true
              }
            }
          }
        },
        workDiaries: {
          include: {
            workDiaryItems: {
              include: {
                worker: true
              }
            }
          }
        },
        workTools: true
      }
    });

    if (!work) {
      return { success: false, error: "Munka nem található" };
    }

    // Töröljük a régi RAG bejegyzéseket ehhez a munkához
    await prisma.knowledgeBase.deleteMany({
      where: {
        tenantEmail,
        metadata: {
          path: ['workId'],
          equals: workId
        }
      }
    });

    let syncedItems = 0;

    // Munka alapadatok szinkronizálása
    const workContent = `
Munka: ${work.title || 'Nincs cím'}
Leírás: ${work.offerDescription || 'Nincs leírás'}
Helyszín: ${work.location || 'Nincs megadva'}
Munkások: ${work.totalWorkers || 0} fő
Munkaköltség: ${work.totalLaborCost || 0} Ft
Anyagköltség: ${work.totalMaterialCost || 0} Ft
Eszközök: ${work.totalTools || 0} db
Eszközköltség: ${work.totalToolCost || 0} Ft
Anyagok: ${work.totalMaterials || 0} db
Státusz: ${work.status || 'Nincs megadva'}
Haladás: ${work.progress || 0}%
    `.trim();

    await addRAGContext(workContent, 'work_basic', {
      source: 'work',
      workId: work.id,
      title: work.title,
      status: work.status,
      totalWorkers: work.totalWorkers,
      totalLaborCost: work.totalLaborCost,
      lastSync: new Date().toISOString()
    });
    syncedItems++;

    // WorkItem-ek szinkronizálása
    for (const item of work.workItems) {
      // Munkások listája ehhez a workItem-hez
      const workers = item.workItemWorkers
        ?.map((wiw: any) => wiw.workforceRegistry?.name || 'Névtelen munkás')
        .join(', ') || 'Nincs munkás hozzárendelve';

      const itemContent = `
Munkafázis: ${item.name}
Mennyiség: ${item.quantity} ${item.unit}
Elvégzett: ${item.completedQuantity || 0} ${item.unit}
Progress: ${item.progress || 0}%
Státusz: ${item.inProgress ? 'Folyamatban' : 'Nem aktív'}
Munkások: ${workers}
Projekt: ${work.title}
      `.trim();

      await addRAGContext(itemContent, 'work_items', {
        source: 'workItem',
        workId: work.id,
        workItemId: item.id,
        workTitle: work.title,
        itemName: item.name,
        workers: workers,
        lastSync: new Date().toISOString()
      });
      syncedItems++;
    }

    // WorkDiary szinkronizálása (legutóbbi bejegyzések)
    for (const diary of work.workDiaries) {
      if (!diary.workDiaryItems || diary.workDiaryItems.length === 0) continue;

      // Csoportosítás dátum szerint (legutóbbi 10 nap)
      const recentItems = diary.workDiaryItems
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      for (const diaryItem of recentItems) {
        const workerName = diaryItem.worker?.name || 'Névtelen munkás';
        const date = new Date(diaryItem.date).toLocaleDateString('hu-HU');
        
        const diaryContent = `
Naplóbejegyzés: ${date}
Munkás: ${workerName}
Munkaórák: ${diaryItem.workHours || 0} óra
Megjegyzés: ${diaryItem.notes || 'Nincs megjegyzés'}
Projekt: ${work.title}
        `.trim();

        await addRAGContext(diaryContent, 'work_diary', {
          source: 'workDiaryItem',
          workId: work.id,
          workTitle: work.title,
          workerName: workerName,
          date: date,
          workHours: diaryItem.workHours,
          lastSync: new Date().toISOString()
        });
        syncedItems++;
      }
    }

    return {
      success: true,
      message: `Munka szinkronizálva RAG-be: ${syncedItems} elem`,
      syncedItems
    };

  } catch (error) {
    console.error('❌ Auto RAG sync hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Automatikus RAG szinkronizáció egy ajánlathoz
export async function autoSyncOfferToRAG(offerId: number) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    
    // Ajánlat lekérése
    const offer = await prisma.offer.findUnique({
      where: { id: offerId, tenantEmail }
    });

    if (!offer) {
      return { success: false, error: "Ajánlat nem található" };
    }

    // Töröljük a régi RAG bejegyzéseket ehhez az ajánlathoz
    await prisma.knowledgeBase.deleteMany({
      where: {
        tenantEmail,
        metadata: {
          path: ['offerId'],
          equals: offerId
        }
      }
    });

    let syncedItems = 0;

    // Ajánlat alapadatok szinkronizálása
    const offerContent = `
Cím: ${offer.title || 'Nincs megadva'}
Leírás: ${offer.description || 'Nincs megadva'}
Összár: ${offer.totalPrice} Ft
Munka összege: ${offer.workTotal || 0} Ft
Anyag összege: ${offer.materialTotal || 0} Ft
Státusz: ${offer.status}
Megjegyzések: ${offer.notes || 'Nincs megadva'}
    `.trim();

    await addRAGContext(offerContent, 'offers', {
      source: 'offer',
      offerId: offer.id,
      title: offer.title,
      description: offer.description,
      total: offer.totalPrice,
      workTotal: offer.workTotal,
      materialTotal: offer.materialTotal,
      status: offer.status,
      notes: offer.notes,
      lastSync: new Date().toISOString()
    });
    syncedItems++;

    // Ajánlat tételek szinkronizálása
    if (offer.items && Array.isArray(offer.items)) {
      for (const item of offer.items as any[]) {
        const itemContent = `
Tétel: ${item.name || 'Névtelen tétel'}
Mennyiség: ${item.quantity || 0} ${item.unit || 'db'}
Egységár: ${item.unitPrice || 0} Ft
Összeg: ${item.totalPrice || 0} Ft
Ajánlat: ${offer.title || 'Nincs cím'}
        `.trim();

        await addRAGContext(itemContent, 'offer_items', {
          source: 'offerItem',
          offerId: offer.id,
          offerTitle: offer.title,
          itemName: item.name,
          lastSync: new Date().toISOString()
        });
        syncedItems++;
      }
    }

    return {
      success: true,
      message: `Ajánlat szinkronizálva RAG-be: ${syncedItems} elem`,
      syncedItems
    };

  } catch (error) {
    console.error('❌ Auto RAG sync hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Háttérben futó teljes szinkronizáció (cron job-hoz)
export async function backgroundRAGSync() {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    // Legutóbb módosított munkák és ajánlatok lekérése
    const recentWorks = await prisma.work.findMany({
      where: { 
        tenantEmail,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Utolsó 24 óra
        }
      },
      select: { id: true, title: true, updatedAt: true }
    });

    const recentOffers = await prisma.myWork.findMany({
      where: { 
        tenantEmail,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Utolsó 24 óra
        }
      },
      select: { id: true, customerName: true, updatedAt: true }
    });

    let totalSynced = 0;

    // Munkák szinkronizálása
    for (const work of recentWorks) {
      const result = await autoSyncWorkToRAG(work.id);
      if (result.success) {
        totalSynced += result.syncedItems || 0;
      }
    }

    // Ajánlatok szinkronizálása
    for (const offer of recentOffers) {
      const result = await autoSyncOfferToRAG(offer.id);
      if (result.success) {
        totalSynced += result.syncedItems || 0;
      }
    }

    return {
      success: true,
      message: `Háttér szinkronizáció kész: ${totalSynced} elem`,
      worksProcessed: recentWorks.length,
      offersProcessed: recentOffers.length,
      totalSynced
    };

  } catch (error) {
    console.error('❌ Háttér RAG sync hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
