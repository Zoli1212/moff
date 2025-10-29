"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { getRAGContext } from "@/actions/rag-context-actions";

/**
 * Betölti a felhasználó munkáinak és ajánlatainak összefoglalóit
 * a chat asszisztens kontextusához
 */
export async function getAssistantContext() {
  try {
    const { user, tenantEmail } = await getTenantSafeAuth();

    // Munkák lekérése
    const works = await prisma.work.findMany({
      where: {
        tenantEmail: tenantEmail,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        workSummary: true,
        location: true,
        estimatedDuration: true,
        progress: true,
        totalCompleted: true,
        totalBillable: true,
        totalBilled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Max 20 munka
    });

    // Ajánlatok lekérése
    const offers = await prisma.offer.findMany({
      where: {
        tenantEmail: tenantEmail,
      },
      select: {
        id: true,
        title: true,
        offerSummary: true,
        status: true,
        totalPrice: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Max 20 ajánlat
    });

    // Kontextus formázása
    let context = "";

    if (works.length > 0) {
      context += "## MUNKÁK:\n\n";
      works.forEach((work, idx) => {
        context += `${idx + 1}. ${work.title}\n`;
        if (work.workSummary) {
          context += `   Összefoglaló: ${work.workSummary}\n`;
        }
        if (work.location) {
          context += `   Helyszín: ${work.location}\n`;
        }
        if (work.estimatedDuration) {
          context += `   Időtartam: ${work.estimatedDuration}\n`;
        }
        if (work.progress !== null) {
          context += `   Haladás: ${work.progress}%\n`;
        }
        if (work.totalCompleted !== null && work.totalBillable !== null) {
          context += `   Teljesítés: ${work.totalCompleted}/${work.totalBillable}\n`;
        }
        if (work.totalBilled !== null) {
          context += `   Számlázva: ${work.totalBilled}\n`;
        }
        context += "\n";
      });
    }

    if (offers.length > 0) {
      context += "## AJÁNLATOK:\n\n";
      offers.forEach((offer, idx) => {
        context += `${idx + 1}. ${offer.title || "Névtelen ajánlat"}\n`;
        if (offer.offerSummary) {
          context += `   Összefoglaló: ${offer.offerSummary}\n`;
        }
        context += `   Státusz: ${offer.status === "draft" ? "Ajánlatadás" : offer.status === "work" ? "Munka" : offer.status}\n`;
        if (offer.totalPrice !== null) {
          context += `   Összeg: ${offer.totalPrice} Ft\n`;
        }
        context += "\n";
      });
    }

    if (context === "") {
      context = "Még nincsenek munkák vagy ajánlatok.";
    }

    return {
      success: true,
      context,
      worksCount: works.length,
      offersCount: offers.length,
    };
  } catch (error) {
    console.error("[getAssistantContext] Error:", error);
    return {
      success: false,
      context: "",
      worksCount: 0,
      offersCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * RAG-enhanced kontextus betöltés a chat asszisztenshez
 * Kombinálja a summary-kat és a semantic search eredményeket
 */
export async function getAssistantContextWithRAG(userQuestion: string) {
  try {
    // 1. Alapvető summary-k (gyors áttekintés)
    const summaryResult = await getAssistantContext();
    
    // 2. Semantic search - releváns részletek a KnowledgeBase-ből
    const ragResult = await getRAGContext(userQuestion);
    
    let detailedContext = "";
    if (ragResult.success && ragResult.context.length > 0) {
      detailedContext = "\n\n## RÉSZLETES INFORMÁCIÓK (releváns a kérdéshez):\n\n";
      ragResult.context.forEach((item: any, idx: number) => {
        detailedContext += `${idx + 1}. [${item.category}] ${item.content}\n\n`;
      });
    }
    
    return {
      success: true,
      summaries: summaryResult.context,
      details: detailedContext,
      fullContext: summaryResult.context + detailedContext,
      worksCount: summaryResult.worksCount,
      offersCount: summaryResult.offersCount,
      ragItemsCount: ragResult.success ? ragResult.context.length : 0,
    };
  } catch (error) {
    console.error("[getAssistantContextWithRAG] Error:", error);
    // Fallback: csak summary-k
    const summaryResult = await getAssistantContext();
    return {
      success: false,
      summaries: summaryResult.context,
      details: "",
      fullContext: summaryResult.context,
      worksCount: summaryResult.worksCount,
      offersCount: summaryResult.offersCount,
      ragItemsCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
