"use server";

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { getRAGConfig, ragLog, ragError, truncateContext } from "@/lib/rag-config";

// RAG kontextus lekérése egy adott témához
export async function getRAGContext(query: string, category?: string) {
  const config = getRAGConfig();
  
  // Ha RAG ki van kapcsolva, üres kontextust adunk vissza
  if (!config.enabled) {
    ragLog('RAG kikapcsolva, üres kontextus visszaadása');
    return { success: true, context: [] };
  }

  try {
    const { tenantEmail } = await getTenantSafeAuth();
    ragLog(`RAG kontextus keresés: "${query}" kategória: ${category || 'összes'}`);

    // Keresés a tudásbázisban
    const contextItems = await prisma.knowledgeBase.findMany({
      where: {
        tenantEmail,
        ...(category && config.allowedCategories.includes(category) && { category }),
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { metadata: { path: ['keywords'], array_contains: query } }
        ]
      },
      take: config.maxContextItems,
      orderBy: { updatedAt: 'desc' }
    });

    ragLog(`RAG találatok: ${contextItems.length} elem`);

    return {
      success: true,
      context: contextItems.map((item: any) => ({
        id: item.id,
        content: truncateContext(item.content),
        category: item.category,
        source: item.metadata?.source || 'unknown'
      }))
    };
  } catch (error) {
    ragError('RAG context retrieval error:', error);
    return { success: false, context: [] };
  }
}

// RAG kontextus hozzáadása
export async function addRAGContext(
  content: string, 
  category: string, 
  metadata?: any
) {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const newContext = await prisma.knowledgeBase.create({
      data: {
        content,
        category,
        metadata: metadata || {},
        tenantEmail
      }
    });

    return { success: true, id: newContext.id };
  } catch (error) {
    console.error('RAG context add error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// AI prompt bővítése RAG kontextussal
export async function enhancePromptWithRAG(
  originalPrompt: string,
  query: string,
  enabled: boolean = true
) {
  const config = getRAGConfig();
  
  // Ha RAG globálisan ki van kapcsolva vagy lokálisan letiltva
  if (!config.enabled || !enabled) {
    ragLog('RAG prompt bővítés kihagyva (kikapcsolva)');
    return originalPrompt;
  }

  ragLog(`RAG prompt bővítés kezdése: "${query}"`);

  const ragResult = await getRAGContext(query);
  
  if (!ragResult.success || ragResult.context.length === 0) {
    ragLog('Nincs RAG kontextus, eredeti prompt visszaadása');
    return originalPrompt;
  }

  const contextText = ragResult.context
    .map((item: any) => `- ${item.content} (${item.category})`)
    .join('\n');

  const enhancedPrompt = `${originalPrompt}

RELEVÁNS KONTEXTUS A KORÁBBI PROJEKTEKBŐL:
${truncateContext(contextText)}

Használd fel ezt a kontextust a válaszadáshoz, de csak akkor, ha releváns.`;

  ragLog(`RAG prompt bővítés kész: ${ragResult.context.length} kontextus elem hozzáadva`);
  
  return enhancedPrompt;
}
