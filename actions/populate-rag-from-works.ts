"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { addRAGContext } from "./rag-context-actions";

// Munkák betöltése RAG-be
export async function populateRAGFromWorks() {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    
    console.log("🔄 RAG feltöltés kezdése munkákból...");
    
    // Munkák lekérése workItem-ekkel együtt
    const works = await prisma.work.findMany({
      where: { tenantEmail },
      include: {
        workItems: true,
        materials: true,
        tools: true,
        workers: true
      }
    });

    let addedCount = 0;

    for (const work of works) {
      // Munka alapadatok
      const workContent = `
Munka: ${work.title}
Leírás: ${work.offerDescription || 'Nincs leírás'}
Helyszín: ${work.location || 'Nincs megadva'}
Státusz: ${work.status}
Kezdés: ${work.startDate?.toLocaleDateString() || 'Nincs megadva'}
Befejezés: ${work.endDate?.toLocaleDateString() || 'Nincs megadva'}
Költségvetés: 'Nincs megadva' Ft
      `.trim();

      await addRAGContext(workContent, 'work_basic', {
        source: 'work',
        workId: work.id,
        workName: work.title
      });
      addedCount++;

      // WorkItem-ek
      for (const item of work.workItems) {
        const itemContent = `
Munkafázis: ${item.name}
Mennyiség: ${item.quantity} ${item.unit}
Elvégzett: ${item.completedQuantity || 0} ${item.unit}
Progress: ${item.progress || 0}%
Státusz: ${item.inProgress ? 'Folyamatban' : 'Nem aktív'}
Projekt: ${work.title}
        `.trim();

        await addRAGContext(itemContent, 'work_items', {
          source: 'workItem',
          workId: work.id,
          workItemId: item.id,
          workName: work.title,
          itemName: item.name
        });
        addedCount++;
      }

      // Anyagok
      for (const material of work.materials) {
        const materialContent = `
Anyag: ${material.name}
Szükséges mennyiség: ${material.quantity} ${material.unit}
Elérhető: ${material.availableQuantity || 0} ${material.unit}
Projekt: ${work.title}
        `.trim();

        await addRAGContext(materialContent, 'materials', {
          source: 'material',
          workId: work.id,
          materialId: material.id,
          workName: work.title
        });
        addedCount++;
      }

      // Eszközök
      for (const tool of work.tools) {
        const toolContent = `
Eszköz: ${tool.name}
Szükséges: ${tool.quantity} db
Használt napok: ${tool.daysUsed || 0} nap
Projekt: ${work.title}
        `.trim();

        await addRAGContext(toolContent, 'tools', {
          source: 'tool',
          workId: work.id,
          toolId: tool.id,
          workName: work.title
        });
        addedCount++;
      }
    }

    console.log(`✅ RAG feltöltés kész: ${addedCount} elem hozzáadva`);
    
    return {
      success: true,
      message: `${addedCount} elem betöltve a RAG tudásbázisba`,
      worksProcessed: works.length,
      itemsAdded: addedCount
    };

  } catch (error) {
    console.error('❌ RAG feltöltés hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Ajánlatok betöltése RAG-be
export async function populateRAGFromOffers() {
  try {
    const { tenantEmail } = await getTenantSafeAuth();
    
    console.log("🔄 RAG feltöltés kezdése ajánlatokból...");
    
    // Ajánlatok lekérése
    const offers = await prisma.myWork.findMany({
      where: { tenantEmail },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        location: true,
        createdAt: true
      }
    });

    let addedCount = 0;

    for (const offer of offers) {
      // Ajánlat alapadatok
      const offerContent = `
Ügyfél: ${offer.customerName || 'Nincs megadva'}
Email: ${offer.customerEmail || 'Nincs megadva'}
Projekt típus: 'Nincs megadva'
Helyszín: ${offer.location || 'Nincs megadva'}
Költségvetés: 'Nincs megadva'
Határidő: 'Nincs megadva'
Követelmények: 'Nincs megadva'
Létrehozva: ${offer.createdAt.toLocaleDateString()}
      `.trim();

      await addRAGContext(offerContent, 'offers', {
        source: 'offer',
        offerId: offer.id,
        customerName: offer.customerName,
        projectType: 'Nincs megadva'
      });
      addedCount++;

      // Ajánlat tételek - jelenleg nem elérhető
    }

    console.log(`✅ RAG feltöltés kész: ${addedCount} elem hozzáadva`);
    
    return {
      success: true,
      message: `${addedCount} elem betöltve a RAG tudásbázisba`,
      offersProcessed: offers.length,
      itemsAdded: addedCount
    };

  } catch (error) {
    console.error('❌ RAG feltöltés hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Összes adat betöltése
export async function populateAllRAGData() {
  try {
    const workResult = await populateRAGFromWorks();
    const offerResult = await populateRAGFromOffers();

    const totalItems = (workResult.itemsAdded || 0) + (offerResult.itemsAdded || 0);

    return {
      success: workResult.success && offerResult.success,
      message: `Összesen ${totalItems} elem betöltve a RAG tudásbázisba`,
      workResult,
      offerResult,
      totalItems
    };
  } catch (error) {
    console.error('❌ Teljes RAG feltöltés hiba:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
