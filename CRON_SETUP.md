# Daily Material Price Check - Cron Job Setup

## Áttekintés

Ez a rendszer naponta reggel 6:00-kor automatikusan ellenőrzi **minden material** piaci árát, és elmenti az eredményt a `Material.bestMarketOffer` mezőbe.

## Módosítások

### 1. Prisma Schema
A `Material` modellhez hozzáadtunk két új mezőt:
- `bestMarketOffer` (Json?) - A napi árellenőrzés eredménye
- `lastPriceCheck` (DateTime?) - Az utolsó ellenőrzés időpontja

```prisma
model Material {
  // ... existing fields ...
  bestMarketOffer   Json?       // Daily automated market price check result
  lastPriceCheck    DateTime?   // Last time price was checked automatically
}
```

**Fontos:** Futtasd le a migrációt:
```bash
npx prisma migrate dev --name add_material_best_market_offer
```

### 2. Új Fájlok

#### `/actions/material-price-checker.ts`
- `checkMaterialPrice()` - Egyetlen material árának ellenőrzése
- `runDailyMaterialPriceCheck()` - Összes material árellenőrzése batch-ekben

#### `/app/api/cron/daily-price-check/route.ts`
- Cron job endpoint
- Authorization: Bearer token (CRON_SECRET)

#### `/vercel.json`
- Vercel cron konfiguráció
- Ütemezés: minden nap reggel 6:00 (0 6 * * *)

## Setup

### 1. Environment Variables
Add hozzá a `.env` fájlhoz:
```env
CRON_SECRET=your-very-secret-cron-key-here
```

### 2. Vercel Cron (Production)
A Vercel automatikusan felismeri a `vercel.json` fájlt és beállítja a cron job-ot.

A cron job:
- Minden nap reggel 6:00-kor fut
- Automatikusan küldi a `CRON_SECRET` header-t
- Batch-ekben dolgozza fel az anyagokat (10-esével)

### 3. Manual Testing (Development)

Teszteld a cron job-ot manuálisan:

```bash
curl -X POST http://localhost:3000/api/cron/daily-price-check \
  -H "Authorization: Bearer your-very-secret-cron-key-here"
```

Vagy böngészőből: hozzáadni egy test gombot az admin felületen.

## Működés

1. **6:00 AM** - Vercel automatikusan meghívja a `/api/cron/daily-price-check` endpoint-ot
2. A rendszer lekéri **az összes material-t** (nem csak a folyamatban lévőket)
3. Minden material-ra:
   - Scraping OBI és Praktiker webshopokból
   - Legjobb ár kiválasztása
   - Megtakarítás számítása a jelenlegi `unitPrice`-hoz képest
4. Eredmény mentése a `bestMarketOffer` mezőbe
5. `lastPriceCheck` frissítése

## Különbség a meglévő rendszerrel

### Meglévő (NE MÓDOSÍTSD):
- `WorkItem.currentMarketPrice` - Manuális, felhasználó által indított ellenőrzés
- Csak folyamatban lévő munkatételekhez
- Real-time frissítés a UI-on

### Új (Automatikus):
- `Material.bestMarketOffer` - Automatikus, napi ellenőrzés
- **Minden material-ra**, függetlenül a work státuszától
- Háttérben fut, nincs UI interakció

## Monitoring

A cron job log-okat a Vercel Dashboard-on tudod ellenőrizni:
- Dashboard > Project > Logs > Filter by "cron"

Vagy a konzol output-ot:
```
Starting daily material price check...
Found 150 materials to check
Daily price check completed: 120 successful, 30 failed
```

## Jövőbeli Fejlesztési Lehetőségek

- Email értesítés ha jelentős árcsökkenés van
- Dashboard widget az árváltozások megjelenítésére
- Több webshop hozzáadása (Baumax, Hornbach, stb.)
- Intelligens ütemezés (gyakrabban ellenőrizze a változékony árú termékeket)
