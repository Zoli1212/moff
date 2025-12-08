# Database Testing Rendszer

## 🧪 Átfogó Database Testing Framework

Ez a dokumentum a teljes database testing rendszer bemutatását tartalmazza, amely minden server action-t lefed automatizált tesztekkel.

## 📁 Projekt Struktúra

```
tests/
├── setup.ts                    # Test konfiguráció és cleanup utilities
├── vitest.config.ts            # Vitest beállítások és alias-ok
├── package.json                # Test dependencies
├── rag-actions.test.ts         # RAG szinkronizáció tesztek
├── offer-actions.test.ts       # Ajánlat műveletek tesztek
├── work-actions.test.ts        # Munka műveletek tesztek
└── workforce-actions.test.ts   # Munkás fizetés tesztek
```

## 🚀 Telepítés és Futtatás

### 1. Telepítés
```bash
cd tests
npm install
```

### 2. Környezeti változók beállítása
```bash
# .env fájlban (opcionális test database)
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/test_db"
```

### 3. Tesztek futtatása

#### Alapvető parancsok:
```bash
# Összes teszt futtatása
npm test

# Watch módban (automatikus újrafuttatás változáskor)
npm run test:watch

# UI felülettel (böngészőben)
npm run test:ui

# Coverage riporttal
npm run test:coverage

# Egyszeri futtatás (CI/CD-hez)
npm run test:run
```

#### Specifikus tesztek:
```bash
# Csak RAG tesztek
npm test rag-actions

# Csak offer tesztek
npm test offer-actions

# Csak work tesztek
npm test work-actions

# Csak workforce tesztek
npm test workforce-actions
```

## 🎯 Tesztelt Funkciók

### 🔄 RAG Actions (`rag-actions.test.ts`)

#### `addRAGContext` tesztek:
- ✅ Kontextus hozzáadása knowledge base-hez
- ✅ Duplikált tartalom kezelése
- ✅ Metadata tárolás és lekérés
- ✅ Kategória szerinti szervezés

#### `searchRAGContext` tesztek:
- ✅ Releváns kontextus keresése
- ✅ MaxResults paraméter tiszteletben tartása
- ✅ Keresési pontosság ellenőrzése

#### `autoSyncOfferToRAG` tesztek:
- ✅ Ajánlat szinkronizáció knowledge base-be
- ✅ Offer items szinkronizáció
- ✅ Nem létező ajánlat kezelése
- ✅ Komplex ajánlat struktúrák

#### `autoSyncWorkToRAG` tesztek:
- ✅ Munka szinkronizáció knowledge base-be
- ✅ Work items szinkronizáció
- ✅ Nem létező munka kezelése
- ✅ Teljes RAG workflow teszt

### 📋 Offer Actions (`offer-actions.test.ts`)

#### `saveOfferWithRequirements` tesztek:
- ✅ Új ajánlat létrehozása MyWork-kel
- ✅ Requirement verziókezelés
- ✅ Létező munka frissítése
- ✅ Hiányzó mezők kezelése
- ✅ Komplex ajánlat tartalom parsing
- ✅ Database tranzakció rollback hibák esetén

### 🏗️ Work Actions (`work-actions.test.ts`)

#### `updateWorkWithAIResult` tesztek:
- ✅ Munka frissítése AI eredményekkel
- ✅ WorkItem-ek létrehozása
- ✅ Aggregált mezők számítása
- ✅ Nem létező munka kezelése
- ✅ Jogosulatlan hozzáférés kezelése
- ✅ Üres workItems tömb kezelése
- ✅ Database hibák kezelése

### 👷 Workforce Actions (`workforce-actions.test.ts`)

#### `addSalaryChange` tesztek:
- ✅ Új fizetés változtatás rekord
- ✅ Ugyanazon dátumra történő frissítés
- ✅ Nem létező munkás kezelése
- ✅ Többszörös fizetéstörténet

#### `getCurrentSalary` tesztek:
- ✅ Aktuális fizetés lekérése dátum alapján
- ✅ Jövőbeli dátumokra legutóbbi fizetés
- ✅ Fallback WorkforceRegistry dailyRate-re
- ✅ Nem létező munkás kezelése
- ✅ Edge case dátumok kezelése

#### Integrációs tesztek:
- ✅ Teljes fizetési workflow
- ✅ Work diary items-ekkel való integráció
- ✅ Konkurens fizetésváltozások

## 🛠️ Test Setup és Utilities

### Test Database Konfiguráció
```typescript
// setup.ts
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

export const TEST_TENANT_EMAIL = 'test@example.com';
```

### Cleanup Utilities
```typescript
// Automatikus cleanup minden teszt előtt
beforeEach(async () => {
  await cleanupTestData();
});

// Teljes test adatok törlése
export async function cleanupTestData() {
  // Foreign key constraints figyelembevételével
  await testPrisma.knowledgeBase.deleteMany({...});
  await testPrisma.workDiaryItem.deleteMany({...});
  // ... stb
}
```

### Test Data Factories
```typescript
// Gyors test adatok létrehozása
export async function createTestMyWork() { /* ... */ }
export async function createTestOffer(requirementId: number) { /* ... */ }
export async function createTestWork(offerId: number) { /* ... */ }
export async function createTestWorker() { /* ... */ }
```

## 🎭 Mocking Stratégia

### Auth Mocking
```typescript
vi.mock('@/actions/auth-actions', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));
```

### RAG Sync Mocking
```typescript
vi.mock('@/actions/auto-rag-sync', () => ({
  autoSyncOfferToRAG: vi.fn().mockResolvedValue({ success: true, syncedItems: 1 }),
  autoSyncWorkToRAG: vi.fn().mockResolvedValue({ success: true, syncedItems: 1 })
}));
```

### Next.js Cache Mocking
```typescript
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));
```

## 📊 Test Coverage

### Lefedett Server Actions:
- ✅ `auto-rag-sync.ts` - RAG szinkronizáció
- ✅ `rag-context-actions.ts` - RAG kontextus kezelés
- ✅ `offer-actions.ts` - Ajánlat műveletek
- ✅ `work-actions.ts` - Munka műveletek
- ✅ `salary-helper.ts` - Fizetés kezelés

### Test Típusok:
- 🧪 **Unit Tests** - Egyedi függvények tesztelése
- 🔗 **Integration Tests** - Komponensek közötti együttműködés
- 💾 **Database Tests** - Adatbázis műveletek ellenőrzése
- ❌ **Error Handling Tests** - Hibakezelés tesztelése
- 🔒 **Authorization Tests** - Jogosultság ellenőrzése

## 🚨 Hibakezelés Tesztelése

### Database Hibák
```typescript
// Prisma mock hibával
const originalCreate = testPrisma.offer.create;
testPrisma.offer.create = vi.fn().mockRejectedValue(new Error('Database error'));

const result = await saveOfferWithRequirements(offerData);
expect(result.success).toBe(false);
```

### Jogosultság Hibák
```typescript
// Különböző tenant-tal létrehozott adat
const work = await testPrisma.work.create({
  data: { tenantEmail: 'different@tenant.com' }
});

const result = await updateWorkWithAIResult(work.id, aiResult);
expect(result.error).toContain('Unauthorized');
```

## 🔧 Vitest Konfiguráció

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '../') }
  }
});
```

## 📈 CI/CD Integráció

### GitHub Actions példa:
```yaml
name: Database Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd tests && npm install
      - run: cd tests && npm run test:run
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

## 🎯 Best Practices

### 1. Test Isolation
- ✅ Minden teszt előtt cleanup
- ✅ Egyedi TEST_TENANT_EMAIL használata
- ✅ Független test adatok

### 2. Realistic Test Data
- ✅ Valós adatstruktúrák használata
- ✅ Edge case-ek tesztelése
- ✅ Unicode karakterek támogatása

### 3. Comprehensive Error Testing
- ✅ Database connection hibák
- ✅ Validation hibák
- ✅ Authorization hibák
- ✅ Transaction rollback tesztek

### 4. Performance Considerations
- ✅ Single fork pool használata
- ✅ Megfelelő timeout beállítások
- ✅ Efficient cleanup strategies

## 🚀 Következő Lépések

### Tesztek Kiterjesztése:
1. **További Server Actions** lefedése
2. **Performance Tests** hozzáadása
3. **Load Testing** implementálása
4. **E2E Integration** tesztek

### Monitoring:
1. **Test Coverage** riportok
2. **Performance Metrics** gyűjtése
3. **CI/CD Pipeline** optimalizálása

---

## 📞 Támogatás

Ha problémába ütközöl a tesztek futtatásakor:

1. **Ellenőrizd** a database connection-t
2. **Nézd meg** a vitest config-ot
3. **Futtasd** a cleanup utility-t manuálisan
4. **Ellenőrizd** a mock-okat

**A database testing rendszer teljes mértékben működőképes és production-ready!** 🎉

Klíma- és fűtésszerelés ❄️🔥
Hasonló munkafolyamat: kiszállás, felmérés, ajánlat, szerelés
Katalógus: klímák, kazánok, radiátorok + munkadíjak
Szezonális csúcsok kezelése
2. Kertészet / Parkfenntartás 🌳
Területmérés (m²) alapú árazás
Ismétlődő munkák (havi karbantartás)
Anyagköltség: növények, föld, műtrágya
3. Takarítás / Facility Management 🧹
m² alapú árazás
Visszatérő munkák (heti/havi)
Munkás beosztás fontos
4. Villanyszerelés ⚡
Hasonló katalógus rendszer
Anyag + munkadíj kalkuláció
Kiszállási díj kezelése
5. Autószerelés / Szerviz 🚗
Munkalapok = Work
Alkatrészek = Materials
Óradíj + alkatrész költség
6. Festés / Mázolás 🎨
m² alapú árazás
Anyagköltség (festék, ecset)
Előkészítés + festés külön tételek