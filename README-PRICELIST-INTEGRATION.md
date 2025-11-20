# PriceList Adatbázis Integráció - AiOfferChatAgent

## Összefoglalás

Az `AiOfferChatAgent` most már **dinamikusan tölti be a PriceList katalógust az adatbázisból** a hardcoded JSON helyett, miközben a régi JSON katalógus **fallback-ként megmarad** a system prompt-ban.

---

## Módosítások

### 1. Cache Rendszer Hozzáadása (9-55. sor)

**Fájl:** `inngest/functions.ts`

```typescript
// ============================================
// PRICELIST CACHE SYSTEM
// ============================================
let priceListCache: any[] | null = null;
let priceListCacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 perc

async function getPriceListCatalog(): Promise<string> {
  const now = Date.now();

  // Cache ellenőrzés
  if (priceListCache && now - priceListCacheTimestamp < CACHE_TTL_MS) {
    console.log("✅ PriceList cache hit");
    return JSON.stringify(priceListCache, null, 2);
  }

  console.log("🔄 PriceList betöltés adatbázisból...");

  try {
    const priceList = await prisma.priceList.findMany({
      where: { tenantEmail: "" },
      select: {
        category: true,
        task: true,
        technology: true,
        unit: true,
        laborCost: true,
        materialCost: true,
      },
      orderBy: [{ category: "asc" }, { task: "asc" }],
    });

    console.log(`✅ PriceList betöltve: ${priceList.length} tétel`);

    priceListCache = priceList;
    priceListCacheTimestamp = now;

    return JSON.stringify(priceList, null, 2);
  } catch (error) {
    console.error("❌ PriceList hiba:", error);
    if (priceListCache) {
      console.log("⚠️ Régi cache használata");
      return JSON.stringify(priceListCache, null, 2);
    }
    return "[]";
  }
}
```

**Funkciók:**

- **Memória cache**: 5 perces TTL (Time To Live)
- **Gyors betöltés**: Első hívás után cache-ből olvas
- **Fallback**: Ha új betöltés sikertelen, régi cache-t használ
- **Adatbázis lekérdezés**: Csak globális PriceList (tenantEmail = "")

---

### 2. PriceList Betöltés az AiOfferAgent Function-ben (4429-4433. sor)

**Fájl:** `inngest/functions.ts`

```typescript
// PriceList katalógus betöltése adatbázisból
console.log("📋 PriceList katalógus betöltése...");
const priceListCatalog = await getPriceListCatalog();
finalInput = `${finalInput}\n\n===PRICE CATALOG===\n${priceListCatalog}`;
console.log("✅ PriceList hozzáadva az input-hoz");
```

**Helye:**

- RAG integráció után
- AI agent hívás előtt

**Működés:**

1. Betölti a PriceList-et az adatbázisból (cache-elve)
2. Hozzáfűzi a user input-hoz `===PRICE CATALOG===` markerrel
3. Az AI agent megkapja a friss katalógust minden hívásnál

---

### 3. System Prompt Módosítás - Fallback Logika (217-221. sor)

**Fájl:** `inngest/functions.ts`

**ELŐTTE:**

```
You must ALWAYS use the catalog below as the ONLY valid source of tasks, units, labor costs and material costs.
```

**UTÁNA:**

```
You must ALWAYS use the catalog as the ONLY valid source of tasks, units, labor costs and material costs.

CATALOG PRIORITY:
1. PRIMARY: Use the catalog provided in the user input (marked as ===PRICE CATALOG===) if available
2. FALLBACK: If no catalog is provided in the input, use the catalog below in this system prompt
```

---

### 4. System Prompt Módosítás - Offer Format Rules (4205. sor)

**Fájl:** `inngest/functions.ts`

**ELŐTTE:**

```
When a user provides a request, always match it with the most relevant tasks from this catalog.
```

**UTÁNA:**

```
When a user provides a request, always match it with the most relevant tasks from the catalog (use the input catalog marked as ===PRICE CATALOG=== if available, otherwise use the catalog in this system prompt).
```

---

## Működési Logika

### Normál Eset (Adatbázis Működik)

```
1. User küld ajánlatkérést
   ↓
2. AiOfferAgent function elindul
   ↓
3. getPriceListCatalog() meghívása
   ↓
4. Cache ellenőrzés
   ├─ Van cache (< 5 perc) → cache-ből visszaadja
   └─ Nincs cache → adatbázisból betölti
   ↓
5. PriceList JSON hozzáfűzése az input-hoz
   ↓
6. AI agent meghívása (AiOfferChatAgent.run(finalInput))
   ↓
7. AI használja az adatbázis katalógust (PRIMARY)
   ↓
8. Ajánlat generálása pontos task nevekkel és árakkal
```

### Fallback Eset (Adatbázis Hiba)

```
1. User küld ajánlatkérést
   ↓
2. AiOfferAgent function elindul
   ↓
3. getPriceListCatalog() meghívása
   ↓
4. Adatbázis hiba történik
   ├─ Van régi cache → régi cache-t használja
   └─ Nincs cache → üres [] tömböt ad vissza
   ↓
5. Üres vagy hiányos katalógus az input-ban
   ↓
6. AI agent meghívása (AiOfferChatAgent.run(finalInput))
   ↓
7. AI észreveszi: nincs ===PRICE CATALOG=== vagy üres
   ↓
8. AI automatikusan használja a system prompt JSON katalógust (FALLBACK)
   ↓
9. Ajánlat generálása a régi JSON katalógusból
```

---

## Előnyök

### 1. **Friss Árak**

- Mindig az adatbázisból jönnek az aktuális árak
- Nincs szükség kód módosításra ár változáskor

### 2. **Gyors Teljesítmény**

- 5 perces cache → minimális adatbázis terhelés
- Első betöltés után memóriából olvas

### 3. **Biztonságos Fallback**

- Ha adatbázis nem elérhető, a régi JSON katalógus működik
- Nincs downtime

### 4. **Egyszerű Karbantartás**

- Árak módosítása az adatbázisban (PriceList tábla)
- Nincs szükség kód deploy-ra

### 5. **Backward Compatible**

- Régi JSON katalógus megmaradt
- Könnyen visszaállítható

---

## Adatbázis Séma

### PriceList Tábla

```prisma
model PriceList {
  id           Int     @id @default(autoincrement())
  tenantEmail  String  // "" = globális, email = tenant-specifikus
  category     String
  task         String
  technology   String
  unit         String
  laborCost    Int
  materialCost Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Lekérdezés:**

```typescript
await prisma.priceList.findMany({
  where: { tenantEmail: "" }, // Csak globális árak
  select: {
    category: true,
    task: true,
    technology: true,
    unit: true,
    laborCost: true,
    materialCost: true,
  },
  orderBy: [{ category: "asc" }, { task: "asc" }],
});
```

---

## Cache Konfiguráció

### Jelenlegi Beállítások

```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 perc
```

### Módosítás (ha szükséges)

**10 perces cache:**

```typescript
const CACHE_TTL_MS = 10 * 60 * 1000;
```

**1 órás cache:**

```typescript
const CACHE_TTL_MS = 60 * 60 * 1000;
```

**Cache törlés (manuális frissítés):**

```typescript
priceListCache = null;
priceListCacheTimestamp = 0;
```

---

## Tesztelés

### 1. Normál Működés Tesztelése

```bash
# Új ajánlat készítése
# Ellenőrizd a console log-okat:
# ✅ "🔄 PriceList betöltés adatbázisból..."
# ✅ "✅ PriceList betöltve: XXXX tétel"
# ✅ "✅ PriceList hozzáadva az input-hoz"
```

### 2. Cache Tesztelése

```bash
# Első hívás: adatbázisból tölt
# Második hívás (5 percen belül): cache-ből olvas
# Ellenőrizd a console log-ot:
# ✅ "✅ PriceList cache hit"
```

### 3. Fallback Tesztelése

```bash
# Állítsd le az adatbázist vagy módosítsd a where feltételt hibásra
# Ellenőrizd, hogy az AI a system prompt JSON katalógust használja
```

---

## Hibaelhárítás

### Probléma: "PriceList betöltve: 0 tétel"

**Ok:** Nincs adat a PriceList táblában vagy rossz where feltétel

**Megoldás:**

```sql
-- Ellenőrizd az adatokat
SELECT COUNT(*) FROM "PriceList" WHERE "tenantEmail" = '';

-- Ha nincs adat, futtasd a seed scriptet
npm run seed:pricelist
```

### Probléma: Cache nem frissül

**Ok:** A cache TTL még nem járt le

**Megoldás:**

```typescript
// Csökkentsd a TTL-t teszteléshez
const CACHE_TTL_MS = 10 * 1000; // 10 másodperc
```

### Probléma: AI nem használja az adatbázis katalógust

**Ok:** A `===PRICE CATALOG===` marker hiányzik vagy rossz helyen van

**Megoldás:**

```typescript
// Ellenőrizd a finalInput tartalmát
console.log("Final input:", finalInput);
// Keresd meg a "===PRICE CATALOG===" stringet
```

---

## Jövőbeli Fejlesztések

### 1. Tenant-specifikus Árak

```typescript
// Módosítsd a where feltételt
const priceList = await prisma.priceList.findMany({
  where: {
    OR: [
      { tenantEmail: "" }, // Globális
      { tenantEmail: userEmail }, // Tenant-specifikus
    ],
  },
});
```

### 2. Redis Cache

```typescript
// Helyettesítsd a memória cache-t Redis-szel
import { Redis } from "ioredis";
const redis = new Redis();

async function getPriceListCatalog(): Promise<string> {
  const cached = await redis.get("pricelist:catalog");
  if (cached) return cached;

  // ... betöltés adatbázisból

  await redis.setex("pricelist:catalog", 300, JSON.stringify(priceList));
  return JSON.stringify(priceList);
}
```

### 3. Webhook-alapú Cache Invalidáció

```typescript
// PriceList módosításkor automatikus cache törlés
export async function invalidatePriceListCache() {
  priceListCache = null;
  priceListCacheTimestamp = 0;
  console.log("🔄 PriceList cache invalidálva");
}
```

---

## Összefoglalás

✅ **Dinamikus katalógus betöltés** az adatbázisból  
✅ **5 perces cache** a gyors teljesítményért  
✅ **Fallback rendszer** a régi JSON katalógussal  
✅ **Pontos task nevek és árak** használata  
✅ **Backward compatible** - könnyen visszaállítható

**Státusz:** ✅ KÉSZ - Tesztelhető
