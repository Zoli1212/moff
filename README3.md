# RAG (Retrieval-Augmented Generation) Rendszer Dokumentáció

## Mi az a RAG?

A RAG (Retrieval-Augmented Generation) egy AI technológia, amely **korábbi projektadatok alapján** javítja az AI agensek válaszait. A rendszer "emlékezik" a korábbi munkákra, ajánlatokra és automatikusan felhasználja ezt a tudást új ajánlatok készítésekor.

## Architektúra

### 1. **Adattárolás**
```sql
-- PostgreSQL táblában tárolódik
CREATE TABLE "knowledge_base" (
  "id"          TEXT PRIMARY KEY,
  "content"     TEXT NOT NULL,        -- RAG kontextus szöveg
  "category"    TEXT NOT NULL,        -- Kategória (work_basic, offers, stb.)
  "metadata"    JSONB,                -- További adatok (workId, offerId, stb.)
  "tenantEmail" TEXT NOT NULL,        -- Tenant izolálás
  "createdAt"   TIMESTAMP DEFAULT NOW(),
  "updatedAt"   TIMESTAMP DEFAULT NOW()
);
```

### 2. **Kategóriák**
- **`work_basic`** - Munka alapadatok (név, leírás, helyszín, költségvetés)
- **`work_items`** - Munkafázisok (mennyiségek, progress)
- **`materials`** - Anyagok (típus, mennyiség)
- **`tools`** - Eszközök (típus, mennyiség)
- **`offers`** - Ajánlatok (ügyfél, projekt típus)
- **`offer_items`** - Ajánlat tételek (név, ár, mennyiség)

## ⚙️ Konfiguráció

### Környezeti változók (.env)
```bash
# RAG rendszer engedélyezése/tiltása
RAG_ENABLED=false                    # false = biztonságos mód

# Maximum kontextus elemek száma (ajánlott: 3-5)
RAG_MAX_CONTEXT_ITEMS=3

# RAG debug mód (részletes logolás)
RAG_DEBUG_MODE=true

# RAG keresési kategóriák (vesszővel elválasztva)
RAG_ALLOWED_CATEGORIES=work_basic,work_items,offers,offer_items,materials,tools

# RAG kontextus maximális karakterszám (token limit miatt)
RAG_MAX_CONTEXT_LENGTH=2000

# RAG cache időtartam másodpercben (performance optimalizálás)
RAG_CACHE_TTL=300
```

## 🔄 Automatikus Szinkronizáció

### Mikor frissül a RAG tudásbázis:

#### 1. **Munkák módosításakor**
```typescript
// work-actions.ts - updateWorkWithAIResult()
export async function updateWorkWithAIResult(workId: number, aiResult: any) {
  // ... normál munka frissítés ...
  
  // Automatikus RAG szinkronizáció (háttérben)
  try {
    await autoSyncWorkToRAG(workId);
    console.log(`✅ RAG automatikusan szinkronizálva munkához: ${workId}`);
  } catch (ragError) {
    console.error(`❌ RAG szinkronizáció hiba munkához ${workId}:`, ragError);
    // Ne blokkoljuk a fő műveletet RAG hiba miatt
  }
}
```

#### 2. **Ajánlatok létrehozásakor**
```typescript
// offer-actions.ts - saveOfferWithRequirements()
export async function saveOfferWithRequirements(data: SaveOfferData) {
  // ... normál ajánlat mentés ...
  
  // Automatikus RAG szinkronizáció (háttérben)
  try {
    await autoSyncOfferToRAG(offer.id);
    console.log(`✅ RAG automatikusan szinkronizálva ajánlathoz: ${offer.id}`);
  } catch (ragError) {
    console.error(`❌ RAG szinkronizáció hiba ajánlathoz ${offer.id}:`, ragError);
    // Ne blokkoljuk a fő műveletet RAG hiba miatt
  }
}
```

### Mit szinkronizál:

#### **Munkáknál:**
- Munka neve, leírása, helyszíne
- Státusz, költségvetés, határidők  
- WorkItem-ek (munkafázisok, mennyiségek, progress)
- Anyagok és eszközök mennyiségei

#### **Ajánlatoknál:**
- Ügyfél adatok (név, email, telefon)
- Projekt típus, helyszín
- Ajánlat tételek és árak
- Követelmények és megjegyzések

## 🤖 AI Agensek Integrációja

### 1. **AiOfferAgent** (Szövegdoboz alapú ajánlat)
```typescript
// Eredeti működés:
const result = await AiOfferChatAgent.run(userInput);

// RAG-enhanced működés (TERVEZETT):
const enhancedInput = await enhancePromptWithRAG(
  userInput, 
  extractKeywords(userInput), // "fürdőszoba", "felújítás"
  true // RAG engedélyezve
);
const result = await AiOfferChatAgent.run(enhancedInput);
```

**Példa RAG bővítés:**
```
Eredeti prompt: "Készíts ajánlatot fürdőszoba felújításra 12nm-en"

RAG-enhanced prompt:
"Készíts ajánlatot fürdőszoba felújításra 12nm-en

RELEVÁNS KONTEXTUS A KORÁBBI PROJEKTEKBŐL:
- Fürdőszoba felújítás: 12nm, szerelvénybontás, burkolat bontás, új gépészet (work_basic)
- Tétel: Fali csempeburkolat 20m², 3500 Ft/m² munkadíj (offer_items)
- Tétel: Padlólap ragasztás 12m², 3500 Ft/m² (offer_items)

Használd fel ezt a kontextust a válaszadáshoz, de csak akkor, ha releváns."
```

### 2. **AiDemandAgent** (PDF/Fájl alapú igény elemzés)
```typescript
// Eredeti működés:
const aiDemandReport = await AiDemandAnalyzerAgent.run(fileText);

// RAG-enhanced működés (TERVEZETT):
const enhancedFileText = await enhancePromptWithRAG(
  fileText,
  extractKeywords(fileText),
  true
);
const aiDemandReport = await AiDemandAnalyzerAgent.run(enhancedFileText);
```

## 📊 RAG Működése Gyakorlatban

### 1. **Kontextus lekérése**
```typescript
// Keresés a tudásbázisban
const ragContext = await getRAGContext(
  "fürdőszoba felújítás", // keresési kulcsszó
  "offers" // kategória (opcionális)
);

// Eredmény:
{
  success: true,
  context: [
    {
      id: "clx123...",
      content: "Fürdőszoba felújítás: 12nm, modern stílus, 2.5M Ft",
      category: "work_basic",
      source: "work"
    },
    // ... további kontextus elemek
  ]
}
```

### 2. **Prompt bővítése**
```typescript
const enhancedPrompt = await enhancePromptWithRAG(
  "Készíts ajánlatot fürdőszoba felújításra",
  "fürdőszoba felújítás",
  true // RAG engedélyezve
);
```

### 3. **Biztonságos működés**
```typescript
// Ha RAG_ENABLED=false
if (!config.enabled) {
  ragLog('RAG kikapcsolva, üres kontextus visszaadása');
  return { success: true, context: [] }; // Üres kontextus
}

// Ha RAG_ENABLED=true de nincs kontextus
if (!ragResult.success || ragResult.context.length === 0) {
  ragLog('Nincs RAG kontextus, eredeti prompt visszaadása');
  return originalPrompt; // Eredeti prompt változatlanul
}
```

## 🛡️ Biztonság és Hibakezelés

### 1. **Környezeti változó alapú vezérlés**
- `RAG_ENABLED=false` → Teljes kikapcsolás, eredeti működés
- `RAG_ENABLED=true` → RAG aktív, kontextus bővítés

### 2. **Try-catch blokkok**
```typescript
try {
  await autoSyncWorkToRAG(workId);
} catch (ragError) {
  console.error('RAG hiba:', ragError);
  // Fő művelet folytatódik, RAG hiba nem blokkolja
}
```

### 3. **Token és költség limitek**
- `RAG_MAX_CONTEXT_ITEMS=3` → Maximum 3 kontextus elem
- `RAG_MAX_CONTEXT_LENGTH=2000` → Maximum 2000 karakter kontextus
- Automatikus kontextus csonkítás hosszú szövegnél

### 4. **Tenant izolálás**
- Minden RAG adat `tenantEmail` alapján szeparált
- Felhasználók csak saját adataikat látják kontextusként

## 🔍 Debug és Monitoring

### Debug logok (RAG_DEBUG_MODE=true)
```bash
🤖 [RAG] RAG kontextus keresés: "fürdőszoba felújítás" kategória: offers
🤖 [RAG] RAG találatok: 3 elem
🤖 [RAG] RAG prompt bővítés kész: 3 kontextus elem hozzáadva
```

### Hiba logok
```bash
❌ [RAG ERROR] RAG context retrieval error: Database connection failed
❌ [RAG ERROR] RAG szinkronizáció hiba munkához 123: Invalid workId
```

## 📈 Előnyök

### 1. **Pontosabb árak**
- AI látja a korábbi hasonló munkák árait
- Reálisabb ajánlatokat készít
- Konzisztens árképzés

### 2. **Gyorsabb feldolgozás**
- AI nem "találgat", hanem tapasztalatra épít
- Kevesebb iteráció szükséges
- Automatikus tételek javaslása

### 3. **Konzisztens terminológia**
- Ugyanazokat a munkafázisokat javasolja
- Egységes szakmai kifejezések
- Standardizált ajánlat struktúra

### 4. **Tanulás és fejlődés**
- Minden új projekt bővíti a tudásbázist
- Folyamatosan javuló ajánlatok
- Automatikus optimalizálás

## 🚀 Telepítés és Beüzemelés

### 1. **Adatbázis migráció**
```bash
npx prisma db push
# vagy
npx prisma migrate dev --name add-knowledge-base
```

### 2. **Környezeti változók beállítása**
```bash
# .env fájlba másold át:
RAG_ENABLED=false  # Kezdetben biztonságos mód
RAG_DEBUG_MODE=true
RAG_MAX_CONTEXT_ITEMS=3
```

### 3. **Szerver újraindítás**
```bash
npm run dev
```

### 4. **Tesztelés**
- Hozz létre egy új munkát → RAG szinkronizáció logok
- Készíts ajánlatot → RAG kontextus használat (ha engedélyezve)
- Ellenőrizd a `knowledge_base` táblát az adatbázisban

## 🔧 Karbantartás

### Adatbázis tisztítás
```sql
-- Régi RAG adatok törlése (opcionális)
DELETE FROM knowledge_base 
WHERE "createdAt" < NOW() - INTERVAL '6 months';
```

### Performance monitoring
- RAG lekérdezések sebessége
- Token használat növekedése
- AI válaszok minőségének változása

## 🎯 Jövőbeli Fejlesztések

### 1. **Vector keresés**
- Szemantikus hasonlóság alapú kontextus keresés
- OpenAI embeddings integráció
- Pontosabb releváns kontextus

### 2. **Intelligens kategorizálás**
- Automatikus kategória felismerés
- Dinamikus kontextus mennyiség
- Relevancia alapú szűrés

### 3. **A/B tesztelés**
- RAG vs nem-RAG ajánlatok összehasonlítása
- Felhasználói visszajelzések gyűjtése
- Automatikus optimalizálás

---

**Fejlesztő megjegyzések:**
- RAG rendszer teljesen opcionális és kikapcsolható
- Meglévő funkcionalitást nem befolyásolja
- Fokozatos bevezetésre tervezve
- Production-ready biztonsági intézkedésekkel
