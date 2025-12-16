# Piaci Ár Tracking Feature

## Áttekintés

Ez a feature automatikusan 3 naponta frissíti az építési anyagok piaci árait OpenAI segítségével, és megjeleníti a felhasználóknak a legjobb elérhető ajánlatokat.

## Implementált Funkciók

### 1. Adatbázis Séma (prisma/schema.prisma)

Két új mező került hozzáadásra a `WorkItem` modellhez:

```prisma
model WorkItem {
  // ... egyéb mezők
  currentMarketPrice Json?      // AI által frissített piaci árak
  lastPriceCheck     DateTime?  // Utolsó árfrissítés időpontja
}
```

A `currentMarketPrice` JSON struktúrája:
```json
{
  "bestPrice": 5000,
  "supplier": "OBI Hungary",
  "url": "https://obi.hu/...",
  "productName": "Pontos terméknév",
  "savings": 1500,
  "checkedAt": "2025-01-15T10:00:00Z",
  "lastRun": "2025-01-15T10:00:00Z"
}
```

### 2. API Endpoints

#### POST `/api/scrape-material-prices`
Egyedi workItem árfrissítése.

**Request body:**
```json
{
  "workItemId": 123,
  "forceRefresh": false
}
```

**Response:**
```json
{
  "success": true,
  "workItemId": 123,
  "currentMarketPrice": { ... },
  "message": "Árak sikeresen frissítve"
}
```

#### GET `/api/scrape-material-prices`
Batch árfrissítés minden aktív munkához (cron job által használva).

**Authorization:**
- `Bearer ${CRON_SECRET}` header vagy
- Bejelentkezett felhasználó

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 50,
    "success": 48,
    "failed": 2,
    "skipped": 0
  },
  "message": "Frissítve 48/50 tétel"
}
```

### 3. Vercel Cron Job (vercel.json)

Automatikus 3 naponkénti futás:
```json
{
  "crons": [
    {
      "path": "/api/scrape-material-prices",
      "schedule": "0 2 */3 * *"
    }
  ]
}
```

Ütemezés: Minden 3. napon hajnali 2:00-kor (UTC).

### 4. UI Komponens Frissítés (TaskCard.tsx)

A TaskCard komponens most már megjeleníti a piaci ár információkat és **automatikusan lekérdezi az árakat** ha nincs még adat:

**Automatikus árfrissítés:**
- Ha nincs `currentMarketPrice` DE van `materialUnitPrice`, automatikusan triggerelődik az árfrissítés
- 500ms késleltetéssel indul hogy ne terhelje túl az API-t oldal betöltéskor
- Loading indicator jelenik meg amíg tart a lekérdezés
- Csak egyszer fut le, többszöri futást blokkolja

**Megjelenített információk:**
- **Jelenlegi ár**: A workItem jelenlegi materialUnitPrice-a
- **Legjobb ajánlat**: Az AI által talált legalacsonyabb ár
- **Megtakarítás**: Mennyit lehet spórolni
- **Kereskedő**: Honnan elérhető
- **Link**: Közvetlen link a termékhez
- **Frissítve**: Mikor volt az utolsó árfrissítés

**Megjelenés:**
- Zöld gradiens háttér ha van jobb ajánlat vagy frissítés folyamatban
- Zöld szöveg a megtakarítás mellett
- Piros szöveg ha drágább lenne
- Klikkelehető link a webshophoz
- "Piaci árak lekérdezése folyamatban..." szöveg loading közben

### 5. OpenAI Prompt

Az AI a következő feladatot kapja:

1. Keres magyar építőanyag webshopokban (OBI, Praktiker, Bauhaus, Leroy Merlin, stb.)
2. Megtalálja a legjobb árat ugyanerre vagy hasonló termékre
3. Visszaadja JSON formátumban az eredményt

**Fontos szabályok:**
- Csak valós, működő webshop linkek
- Ha nincs jobb ár, jelzi
- 60 másodperces timeout
- `gpt-4o` model használata

## Használat

### Automatikus Frissítés (Alapértelmezett)

A TaskCard komponens **automatikusan triggereli az árfrissítést** amikor:
1. Megjelenik egy workItem aminek nincs `currentMarketPrice`-a
2. DE van `materialUnitPrice`-a
3. 500ms késleltetéssel hívja az API-t (rate limiting miatt)

Ez azt jelenti hogy a felhasználónak nem kell manuálisan frissítenie az árakat - az első megtekintéskor automatikusan lefut.

### Manuális Frissítés

Ha mégis manuálisan szeretnéd frissíteni:

```typescript
// Egyedi workItem frissítése
const response = await fetch('/api/scrape-material-prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workItemId: 123,
    forceRefresh: true  // Kényszerített frissítés akkor is ha 3 napnál frissebb
  })
});
```

### Cron Job Futás

A Vercel Cron Job **3 naponta** automatikusan frissíti az árakat minden tenant számára. Csak azokat a workItem-eket frissíti, amelyek:
- Aktív munkához tartoznak (`status: pending vagy in_progress`)
- Még nem voltak frissítve vagy több mint 3 napja frissültek

## Környezeti Változók

A következő környezeti változókat kell beállítani:

```env
# OpenAI API kulcs (már létezik)
OPENAI_API_KEY=sk-...

# Cron job biztonság (új)
CRON_SECRET=your-random-secret-here

# App URL (Vercel-en automatikus)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Költségek és Limitek

- **API hívások**: Max 50 workItem/batch
- **Timeout**: 60 másodperc/workItem
- **Rate limiting**: 1 másodperc késleltetés hívások között
- **OpenAI költség**: ~$0.01-0.02 per workItem (gpt-4o használatával)

## Biztonság

- ✅ Clerk authentication minden endpoint-nál
- ✅ CRON_SECRET a batch endpoint védelméhez
- ✅ Tenant-alapú adatszűrés
- ✅ Worker permission ellenőrzés
- ✅ Server-side timeout védelem

## Következő Lépések

1. ✅ Prisma migráció futtatása
2. ✅ CRON_SECRET beállítása Vercel környezeti változókban
3. ✅ Vercel-re deploy és cron job aktiválás
4. 🔄 Tesztelés production környezetben
5. 🔄 Monitoring és hibajavítás
