# 📊 Offer Generálás - Részletes Logolás

## ✅ Logolás hozzáadva

Részletes logolást adtam hozzá az offer generálás teljes folyamatához, hogy Vercelen pontosan lásd mi történik minden lépésnél.

---

## 🔍 Hol találod a logokat Vercelen?

### 1. **Vercel Dashboard → Runtime Logs**

```
https://vercel.com/[your-team]/[your-project]/deployments/[deployment-id]
```

1. Menj a **Deployments** tab-ra
2. Kattints a legutóbbi deployment-re
3. Kattints a **Runtime Logs** tab-ra
4. Szűrj időpontra vagy keress kulcsszavakra

### 2. **Inngest Dashboard → Function Runs**

```
https://app.inngest.com/
```

1. Menj a **Functions** tab-ra
2. Kattints az **AiOfferAgent** funkcióra
3. Nézd meg a **Runs** listát
4. Kattints egy run-ra a részletes logokért

---

## 📋 Log Struktúra

### **API Route Logok** (`/api/ai-offer-chat-agent`)

```
================================================================================
🌐 [API /ai-offer-chat-agent] Request received
================================================================================
⏰ Timestamp: 2025-12-02T08:15:30.123Z
📥 Request body parsed:
  ├─ userInput length: 250 chars
  └─ userInput preview: Fürdőszoba felújítás...

🚀 [STEP 1] Sending event to Inngest...
  ├─ Event name: AiOfferAgent
  └─ Sending...
  ├─ ✅ Event sent successfully
  └─ Run ID: 01JEXAMPLE123456789
✅ [STEP 1] Inngest event triggered

⏳ [STEP 2] Polling for completion...
  ├─ Poll #10 (5s elapsed)...
  ├─ Poll #20 (10s elapsed)...
  ├─ ✅ Status: Completed (after 12.5s)
  └─ Run completed successfully
✅ [STEP 2] Polling complete - Success

📊 [STEP 3] Extracting result...
  ├─ Output type: object
  ├─ Output keys: role, type, content
  └─ Output size: 5432 chars
✅ [STEP 3] Result extracted

================================================================================
🎉 [API /ai-offer-chat-agent] Request completed successfully
================================================================================
⏰ Finished at: 2025-12-02T08:15:42.456Z
```

### **Inngest Function Logok** (`AiOfferAgent`)

```
================================================================================
🚀 [AiOfferAgent] STARTED
================================================================================
📥 Event data: {...}
⏰ Timestamp: 2025-12-02T08:15:30.456Z

📋 [STEP 1] Parsing event data...
  ├─ userInput length: 250 chars
  ├─ recordId: abc123
  ├─ userEmail: user@example.com
  └─ existingItems: 0 items
✅ [STEP 1] Event data parsed successfully

📝 [STEP 2] Building base input...
  └─ baseInput length: 250 chars
✅ [STEP 2] Base input built

🔍 [STEP 3] RAG Context Enhancement...
  ├─ RAG_ENABLED: undefined
  └─ RAG is disabled, skipping
✅ [STEP 3] Using base input (RAG disabled)

📚 [STEP 4] Loading PriceList Catalog...
  ├─ Fetching catalog from database...
  ├─ Catalog fetched, length: 123456 chars
  ├─ ✅ Catalog loaded: 4000 items
  └─ Source: ✅ PRIMARY (adatbázis - 4000 tétel)
✅ [STEP 4] Catalog loaded: ✅ PRIMARY (adatbázis - 4000 tétel)

🔗 [STEP 5] Appending catalog to input...
  └─ Final input length: 123706 chars
✅ [STEP 5] Input prepared for AI

🤖 [STEP 6] Calling AI Agent (Gemini 2.0 Flash)...
  ├─ Model: gemini-2.0-flash
  ├─ Max retries: 3
  └─ Checking GEMINI_API_KEY...
  └─ GEMINI_API_KEY present: true

  🔄 Attempt 1/3...
  ├─ Sending request to Gemini API...
  ├─ ✅ Response received in 8234 ms
  └─ Response type: object
✅ [STEP 6] AI agent response successful

📊 [STEP 7] Parsing AI Response...
  ├─ Result type: object
  ├─ Result keys: output
  └─ Full result: {...}

📦 [STEP 8] Analyzing response structure...
  ├─ Output is array with 1 items
  ├─ Output[0]: { type: object, keys: role, type, content, hasContent: true }
  ├─ Content preview (5432 chars): **Ajánlat**...
  ├─ 🎯 Found offerSummary: Fürdőszoba teljes felújítása...
  └─ Analysis complete
✅ [STEP 8] Response structure analyzed

💾 [STEP 9] Saving to database...
  ├─ recordId: abc123
  ├─ Preparing history data...
  ├─ tenantEmail: user@example.com
  ├─ aiAgentType: ai-offer-letter
  ├─ content size: 5432 chars
  ├─ ✅ Saved to database, ID: 789
  └─ Created at: 2025-12-02T08:15:38.789Z
✅ [STEP 9] Database save successful

================================================================================
🎉 [AiOfferAgent] COMPLETED SUCCESSFULLY
================================================================================
⏰ Finished at: 2025-12-02T08:15:38.890Z
📊 Result size: 5432 chars
```

---

## ❌ Hiba esetén

### **GEMINI_API_KEY hiányzik**

```
🤖 [STEP 6] Calling AI Agent (Gemini 2.0 Flash)...
  ├─ Model: gemini-2.0-flash
  ├─ Max retries: 3
  └─ Checking GEMINI_API_KEY...
  └─ GEMINI_API_KEY present: false
❌ [CRITICAL ERROR] GEMINI_API_KEY is missing!
   Please set GEMINI_API_KEY in environment variables

================================================================================
💥 [AiOfferAgent] FAILED
================================================================================
❌ Error type: Error
❌ Error message: GEMINI_API_KEY is not configured
❌ Error code: undefined
❌ Error status: undefined
❌ Stack trace:
    at AiOfferAgent (/var/task/inngest/functions.ts:4550:15)
    ...
================================================================================
```

### **Gemini API hiba (401, 403, 429, stb.)**

```
🤖 [STEP 6] Calling AI Agent (Gemini 2.0 Flash)...
  🔄 Attempt 1/3...
  ├─ Sending request to Gemini API...
  └─ ❌ Request failed: Request failed with status code 401
     Error details: {
       status: 401,
       code: undefined,
       message: "Request failed with status code 401",
       stack: "Error: Request failed with status code 401..."
     }
❌ [STEP 6] AI agent call failed permanently

================================================================================
💥 [AiOfferAgent] FAILED
================================================================================
❌ Error type: Error
❌ Error message: Request failed with status code 401
❌ Error code: undefined
❌ Error status: 401
================================================================================
```

### **Rate Limit (429)**

```
🤖 [STEP 6] Calling AI Agent (Gemini 2.0 Flash)...
  🔄 Attempt 1/3...
  ├─ Sending request to Gemini API...
  └─ ❌ Request failed: 429 Too Many Requests
     Error details: { status: 429, ... }
  ⚠️ Rate limit detected, waiting 60s...
  └─ Retries left: 2

  🔄 Attempt 2/3...
  ├─ Sending request to Gemini API...
  ├─ ✅ Response received in 8500 ms
  └─ Response type: object
✅ [STEP 6] AI agent response successful
```

### **Database hiba**

```
💾 [STEP 9] Saving to database...
  ├─ recordId: abc123
  ├─ Preparing history data...
  └─ ❌ Database save failed: Connection timeout

================================================================================
💥 [AiOfferAgent] FAILED
================================================================================
❌ Error type: PrismaClientKnownRequestError
❌ Error message: Connection timeout
================================================================================
```

---

## 🔎 Keresési kulcsszavak Vercelen

A következő kulcsszavakra kereshetsz a Vercel Runtime Logs-ban:

### Sikeres futás:

- `🚀 [AiOfferAgent] STARTED`
- `✅ [STEP 6] AI agent response successful`
- `🎉 [AiOfferAgent] COMPLETED SUCCESSFULLY`

### Hibák:

- `❌ [CRITICAL ERROR]`
- `💥 [AiOfferAgent] FAILED`
- `GEMINI_API_KEY is missing`
- `Request failed with status code`

### Specifikus lépések:

- `[STEP 1]` - Event parsing
- `[STEP 2]` - Base input building
- `[STEP 3]` - RAG enhancement
- `[STEP 4]` - PriceList loading
- `[STEP 5]` - Input preparation
- `[STEP 6]` - AI API call
- `[STEP 7]` - Response parsing
- `[STEP 8]` - Response analysis
- `[STEP 9]` - Database save

---

## 🛠️ Troubleshooting

### 1. **Nem látok semmilyen logot**

**Ok:** Az Inngest event nem triggerelődött

**Ellenőrizd:**

- API route hívás sikeres volt-e
- `inngest.send()` meghívódott-e
- Inngest Dashboard-on látszik-e az event

### 2. **Látom a STARTED logot, de nem a COMPLETED-et**

**Ok:** A function valahol elakadt vagy hibázott

**Ellenőrizd:**

- Melyik STEP után áll meg
- Van-e error log
- Inngest Dashboard-on mi a run status (Running/Failed)

### 3. **GEMINI_API_KEY present: false**

**Ok:** Hiányzik a környezeti változó

**Megoldás:**

1. Vercel Dashboard → Settings → Environment Variables
2. Add hozzá: `GEMINI_API_KEY=your_key`
3. Redeploy

### 4. **Request failed with status code 401**

**Ok:** Rossz vagy lejárt API key

**Megoldás:**

1. Ellenőrizd az API key-t Google AI Studio-ban
2. Generálj új key-t ha szükséges
3. Frissítsd Vercelen
4. Redeploy

### 5. **Rate limit detected**

**Ok:** Túl sok request (60/perc limit)

**Megoldás:**

- Várj 1 percet (automatikus retry van)
- Növeld a kvótát Google Cloud Console-ban

---

## 📊 Teljesítmény metrikák

A logokból kiolvasható:

- **API response time:** `Finished at - Timestamp`
- **AI API call duration:** `Response received in X ms`
- **Total execution time:** `STARTED - COMPLETED`
- **Polling duration:** `Poll count × 0.5s`
- **Input size:** `Final input length`
- **Output size:** `Result size`

---

## ✅ Következő lépések

1. **Deploy a változtatásokat:**

   ```bash
   git add .
   git commit -m "Add detailed logging to offer generation"
   git push
   ```

2. **Teszteld az offer generálást**

3. **Nézd meg a logokat:**

   - Vercel Dashboard → Runtime Logs
   - Inngest Dashboard → Function Runs

4. **Ha hiba van:**
   - Keresd meg a `❌` vagy `💥` jeleket
   - Nézd meg melyik STEP-nél akadt meg
   - Ellenőrizd a hibaüzenetet
   - Javítsd a problémát (pl. add hozzá a GEMINI_API_KEY-t)

---

## 🔗 Hasznos linkek

- **Vercel Logs:** https://vercel.com/docs/observability/runtime-logs
- **Inngest Debugging:** https://www.inngest.com/docs/learn/debugging
- **Gemini API:** https://ai.google.dev/docs
