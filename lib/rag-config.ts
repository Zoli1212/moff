// RAG (Retrieval-Augmented Generation) konfigurációs beállítások

export interface RAGConfig {
  enabled: boolean;
  maxContextItems: number;
  debugMode: boolean;
  allowedCategories: string[];
  maxContextLength: number;
  cacheTTL: number;
}

// Alapértelmezett RAG konfiguráció
const DEFAULT_RAG_CONFIG: RAGConfig = {
  enabled: false, // Biztonsági okokból alapértelmezetten kikapcsolva
  maxContextItems: 3,
  debugMode: true,
  allowedCategories: ['work_basic', 'work_items', 'offers', 'offer_items', 'materials', 'tools'],
  maxContextLength: 2000,
  cacheTTL: 300 // 5 perc
};

// RAG konfiguráció betöltése környezeti változókból
export function getRAGConfig(): RAGConfig {
  return {
    enabled: process.env.RAG_ENABLED === 'true',
    maxContextItems: parseInt(process.env.RAG_MAX_CONTEXT_ITEMS || '3'),
    debugMode: process.env.RAG_DEBUG_MODE === 'true',
    allowedCategories: process.env.RAG_ALLOWED_CATEGORIES?.split(',') || DEFAULT_RAG_CONFIG.allowedCategories,
    maxContextLength: parseInt(process.env.RAG_MAX_CONTEXT_LENGTH || '2000'),
    cacheTTL: parseInt(process.env.RAG_CACHE_TTL || '300')
  };
}

// RAG debug logging
export function ragLog(message: string, data?: unknown) {
  const config = getRAGConfig();
  if (config.debugMode) {
    console.log(`🤖 [RAG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// RAG hiba logging
export function ragError(message: string, error?: unknown) {
  const config = getRAGConfig();
  if (config.debugMode) {
    console.error(`❌ [RAG ERROR] ${message}`, error);
  }
}

// Kontextus hossz ellenőrzése
export function truncateContext(context: string, maxLength?: number): string {
  const config = getRAGConfig();
  const limit = maxLength || config.maxContextLength;
  
  if (context.length <= limit) {
    return context;
  }
  
  const truncated = context.substring(0, limit - 3) + '...';
  ragLog(`Kontextus csonkítva: ${context.length} → ${truncated.length} karakter`);
  return truncated;
}
