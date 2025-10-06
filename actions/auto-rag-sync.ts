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
        workItems: true,
        materials: true,
        tools: true,
        workers: true
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
Munka: ${work.name}
Leírás: ${work.description || 'Nincs leírás'}
Helyszín: ${work.location || 'Nincs megadva'}
Státusz: ${work.status}
Kezdés: ${work.startDate?.toLocaleDateString() || 'Nincs megadva'}
Befejezés: ${work.endDate?.toLocaleDateString() || 'Nincs megadva'}
Költségvetés: ${work.budget || 'Nincs megadva'} Ft
    `.trim();

    await addRAGContext(workContent, 'work_basic', {
      source: 'work',
      workId: work.id,
      workName: work.name,
      lastSync: new Date().toISOString()
    });
    syncedItems++;

    // WorkItem-ek szinkronizálása
    for (const item of work.workItems) {
      const itemContent = `
Munkafázis: ${item.name}
Mennyiség: ${item.quantity} ${item.unit}
Elvégzett: ${item.completedQuantity || 0} ${item.unit}
Progress: ${item.progress || 0}%
Státusz: ${item.inProgress ? 'Folyamatban' : 'Nem aktív'}
Projekt: ${work.name}
      `.trim();

      await addRAGContext(itemContent, 'work_items', {
        source: 'workItem',
        workId: work.id,
        workItemId: item.id,
        workName: work.name,
        itemName: item.name,
        lastSync: new Date().toISOString()
      });
      syncedItems++;
    }

    console.log(`✅ RAG szinkronizáció kész munkához (${workId}): ${syncedItems} elem`);
    
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
    const offer = await prisma.myWork.findUnique({
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
Ügyfél: ${offer.customerName || 'Nincs megadva'}
Email: ${offer.customerEmail || 'Nincs megadva'}
Projekt típus: ${offer.projectType || 'Nincs megadva'}
Helyszín: ${offer.location || 'Nincs megadva'}
Költségvetés: ${offer.budget || 'Nincs megadva'}
Határidő: ${offer.timeline || 'Nincs megadva'}
Követelmények: ${offer.requirements || 'Nincs megadva'}
    `.trim();

    await addRAGContext(offerContent, 'offers', {
      source: 'offer',
      offerId: offer.id,
      customerName: offer.customerName,
      projectType: offer.projectType,
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
Ügyfél projekt: ${offer.customerName} - ${offer.projectType}
        `.trim();

        await addRAGContext(itemContent, 'offer_items', {
          source: 'offerItem',
          offerId: offer.id,
          customerName: offer.customerName,
          itemName: item.name,
          lastSync: new Date().toISOString()
        });
        syncedItems++;
      }
    }

    console.log(`✅ RAG szinkronizáció kész ajánlathoz (${offerId}): ${syncedItems} elem`);
    
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
    
    console.log("🔄 Háttér RAG szinkronizáció kezdése...");
    
    // Legutóbb módosított munkák és ajánlatok lekérése
    const recentWorks = await prisma.work.findMany({
      where: { 
        tenantEmail,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Utolsó 24 óra
        }
      },
      select: { id: true, name: true, updatedAt: true }
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

    console.log(`✅ Háttér RAG szinkronizáció kész: ${totalSynced} elem szinkronizálva`);
    
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
