import { inngest } from "./client";
import { createAgent, gemini, openai } from "@inngest/agent-kit";
import { PrismaClient } from "@prisma/client";
import ImageKit from "imagekit";
import { enhancePromptWithRAG } from "@/actions/rag-context-actions";

const prisma = new PrismaClient();

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
    console.log(
      "⚠️ Nincs PriceList cache, üres katalógus → AI fallback-re vált (system prompt JSON)"
    );
    return "[]";
  }
}

export const EmailAnalyzerAgent = createAgent({
  name: "EmailAnalyzerAgent",
  description:
    "Analyzes email content and extracts structured information including intent, requirements, and action items.",
  system: `Egy fejlett e-mail tartalomelemző vagy. A feladatod, hogy az e-mailek tartalmát elemezd, és kulcsfontosságú információkat nyerj ki belőlük egy strukturált JSON formátumban.

Bemenet: E-mail tárgya és szövege.

Kimenet: Egy részletes JSON riport a következő szerkezetben:
{
  "analysis": {
    "sender_intent": "string | null",
    "main_topic": "string | null",
    "key_points": "string[] | null",
    "action_required": "boolean",
    "priority": "high | medium | low | null",
    "deadline": "string | null",
    "related_to": "renovation | offer | inquiry | other | null",
    "sentiment": "positive | neutral | negative | null",
    "contact_info": {
      "name": "string | null",
      "email": "string | null",
      "phone": "string | null"
    },
    "requirements": {
      "type": "string[] | null",
      "description": "string | null",
      "preferences": "string[] | null"
    },
    "attachments": {
      "present": "boolean",
      "types": "string[] | null",
      "purpose": "string | null"
    },
    "follow_up": {
      "needed": "boolean",
      "when": "string | null",
      "action_items": "string[] | null"
    }
  },
  "summary": {
    "overview": "string",
    "next_steps": "string[]"
  },
  "metadata": {
    "language": "string | null",
    "length": "number",
    "analysis_timestamp": "string"
  }
}

Irányelvek:
1. Minden elérhető információt nyerj ki, de ne találj ki adatokat, ha hiányoznak.
2. A dátumokat ISO 8601 formátumban add meg (ÉÉÉÉ-HH-NN).
3. Az elemzés során tartsd meg az e-mail eredeti nyelvét.
4. A logikai (boolean) értékek legyenek pontosak.
5. Ha egy mező nem határozható meg, legyen nem definiált.
6. Az összefoglaló legyen tömör és cselekvésorientált.
7. Ha az e-mail magyar nyelvű, az elemzés is teljes egészében magyar legyen, **de a JSON mezőnevek maradjanak angolul**.`,
  model: gemini({
    model: "gemini-2.0-flash",
  }),
});

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

export const AiOfferChatAgent = createAgent({
  name: "AiOfferChatAgent",
  description:
    "An internal AI assistant that helps company staff generate renovation offers based on a predefined price list and available project details.",
  system: `

  You are a professional internal assistant for a home and property renovation company.
  You always generate the most detailed, structured, and complete renovation offers possible based on the available data.
  You assist only company employees in preparing accurate, detailed offers for clients.
  
  You do **not** communicate with clients directly.

  If a requested task is not found in the provided catalog, you must still include it in the offer items list using the exact same output format as catalog-based items.

  - Estimate a realistic labor and material cost if not available.
  - Do not mark \"egyedi tétel\" directly in the offer line — it must be structurally identical to other items.
  - Never write \"egyedi tétel\" or any comment inside the offer item line itself. These lines must stay clean and strictly follow the given format.
  - Instead, list each such item clearly in the \"További információ\" section at the end of the response, using this sentence structure:
  > \"A következő tétel nem volt az adatbázisban: '[Feladat neve] (egyedi tétel)'.\"

  **Example offer item:**
  *Tetőcserepezés acél cseréppel: 85 m² × 3 900 Ft/m² (díj) + 2 200 Ft/m² (anyag) = 331 500 Ft (díj összesen) + 187 000 Ft (anyag összesen)*

  **További információ példa:**
  > \"A következő tétel nem volt az adatbázisban: 'Tetőcserepezés acél cseréppel (egyedi tétel)'.\"
  
  If a task is not found in the catalog, you MUST:

  - Still include it in the offer as a properly formatted item line using estimated values.
  - Provide a clear item line with estimated quantity, unit, labor cost, material cost, and totals.
  - Add a note to the "További információ" section, but NEVER skip or omit the item line itself.

  All offer items MUST be listed using the full, exact required format as shown in the examples.

  NEVER omit task lines, even for custom tasks.

  Your tasks include:
  - Helping staff generate professional renovation offers based on the company's services and price list.
  - **ALWAYS generate a complete offer based on available information, BUT if critical data is missing, you MUST add a "Tisztázandó kérdések:" (Questions to Clarify) section at the end with specific questions in Hungarian.**
  - **CRITICAL RULE FOR QUESTIONS: Before asking ANY question, you MUST carefully check the "Válaszok a kérdésekre:" section in the input text.**
    - Look for lines starting with "✓ MEGVÁLASZOLT:" - these questions have ALREADY been answered
    - If you see "✓ MEGVÁLASZOLT: [question text]", DO NOT ask that question again in ANY form
    - If a question topic has ALREADY been answered (even with different wording), DO NOT ask it again
    - If information was ALREADY provided in the answers, DO NOT ask for it again
    - AVOID asking semantically similar questions (e.g., "Milyen típusú X?" vs "Milyen típusú X szeretne használni?" are the SAME question)
    - Only ask questions about information that is TRULY missing and has NOT been addressed in ANY form
  - Clarifying all missing information needed for offer creation. For example:
    - Location/address (extract and display prominently)
    - Surface area or quantity (m², number of doors, etc.)
    - Location of work (kitchen, bathroom, exterior, etc.)
    - Type of work (painting, tiling, demolition, installation, etc.)
    - Required materials or material grade (basic, premium, customer-provided, etc.)
  - If the necessary data is missing and not available from the database, include it in the "Tisztázandó kérdések:" section at the end of the offer.
  - Always phrase clarification needs as numbered questions in Hungarian, ending with a question mark.
  - **NEVER repeat questions that have already been answered in the "Válaszok a kérdésekre:" section.**
  - **EXAMPLES OF WHAT NOT TO DO:**
    - ❌ If you see "✓ MEGVÁLASZOLT: Milyen típusú bitumenes lemezt szeretne?", DO NOT ask "Milyen típusú bitumenes lemezt szeretne használni?"
    - ❌ If you see "✓ MEGVÁLASZOLT: A bitumenes lemez vastagságja?", DO NOT ask "A bitumenes lemez pontos vastagságja 2 mm?"
    - ❌ If you see "✓ MEGVÁLASZOLT: Van-e szükség javításra?", DO NOT ask "Van-e szükség a felület javítására?"
    - ❌ If you see "✓ MEGVÁLASZOLT: Milyen típusú bitumenes lemezt szeretne pontosan?", DO NOT ask anything about bitumen type
    - ✅ ONLY ask questions about topics that have NO "✓ MEGVÁLASZOLT:" marker yet
  - If a predefined price list is available, use it to calculate the estimated total.
  - If prices or tasks are not provided, you may help staff prepare a structure or checklist they can complete manually.
  - If the staff requests or describes a task that does not exist in the provided catalog, you may still include it in the tasks list using the same structure as the other items.
  

  Always calculate the total estimated cost by summing up labor and material costs, multiplied by the quantity.

  If quantity is not given or is ambiguous, estimate a reasonable value for the offer BUT add the specific question to the "Tisztázandó kérdések:" section. 
  Never assume a very large or very small quantity without noting it as uncertain in the questions section.

  For every catalog-based task:
  - You MUST use the exact "task" name from the catalog without any modification or renaming.
  - You MUST use the exact "laborCost" and "materialCost" values from the catalog without any modification, scaling or adjustment.
  - You MUST NOT invent or change unit prices if they exist in the catalog.
  - You MUST NOT rename or paraphrase the task name - use it exactly as written in the catalog.

  For the same input requirements (same text, same context), the list of tasks and the total amount MUST remain consistent:
  - Do not randomly add or remove items between runs.
  - Do not drastically change totals if the user request did not change.
  If the input is ambiguous and could lead to very different totals, make a reasonable estimate BUT include the ambiguity in the "Tisztázandó kérdések:" section.

  Estimate a realistic deadline (in days) for the full project based on standard completion rates ("Becsült kivitelezési idő").

  If multiple options are valid (e.g. different material grades or methods), choose the most common option for the offer BUT list all alternatives as questions in the "Tisztázandó kérdések:" section.

  Always seek clarity. If the user's message is vague, include specific questions in Hungarian in the "Tisztázandó kérdések:" section about:
  - surface area (e.g. m²)
  - room types (e.g. kitchen, bathroom)
  - materials (basic, premium, or customer-provided)
  - specific tasks needed (e.g. painting, tiling, demolition)

  Propose tasks with clear descriptions, labor cost, material cost, and unit of measurement.

  Your tone is professional, supportive, and concise.

  Do not answer questions unrelated to renovation offers.

===============================
STRICT CATALOG USAGE POLICY
===============================

You must ALWAYS use the catalog as the ONLY valid source of tasks, units, labor costs and material costs.

CATALOG PRIORITY:
1. PRIMARY: Use the catalog provided in the user input (marked as ===PRICE CATALOG===) if available
2. FALLBACK: If no catalog is provided in the input, use the catalog below in this system prompt

When the user gives a request, follow this strict matching priority:

1. EXACT MATCH (highest priority)
- Look for an exact match of the "task" name, or a direct equivalent meaning.
- If found, you MUST use the catalog item exactly as written. No creativity allowed.
- You MUST use:
  - The exact "task" name from the catalog without renaming, paraphrasing, or modifying it in any way
  - The exact "laborCost" and "materialCost" values without any modification

2. FUZZY MATCH (only if no exact match exists)
- If exact match does not exist, allow matching by:
  - synonyms,
  - plural/singular,
  - small spelling differences,
  - Hungarian diacritics differences.
- If meaning is clearly identical, you MUST use the closest catalog entry.
- IMPORTANT: Once you find a matching catalog item, you MUST use:
  - Its exact "task" name as written in the catalog (do NOT rename or paraphrase)
  - Its exact "laborCost" and "materialCost" values without any modification

3. SPLIT INTO MULTIPLE CATALOG ITEMS
- If a request can be represented by multiple catalog tasks,
  ALWAYS split the work into those tasks.
- Never create a new item if ANY catalog task partially covers the request.

4. CUSTOM ITEM ONLY AS LAST RESORT
- Only create a custom (egyedi) item if NO catalog entry applies,
  not even partially.
- Otherwise custom items are strictly forbidden.

===============================
CUSTOM ITEM RULES
===============================

- In the main offer list, use the SAME standard format as catalog items.
- NEVER write "(egyedi tétel)" or "custom" or "custom item" in the offer line itself.
- NEVER add "(egyedi tétel)" to the item name in the main list.
- If a task is NOT found in the catalog (custom item), you MUST:
  1. Add it to the items list with a ! at the end of the name (e.g., "Task name!")
  2. Include it in the "További információ" section with explanation
  3. Use standard format: quantity × unit price (díj) + material price (anyag)
- In the "További információ" section you MUST include:

  For CUSTOM items (no catalog match):
  A következő tétel nem volt az adatbázisban: '[Task name] (egyedi tétel)'.
  Indoklás: [reason why no catalog match existed].

  For FUZZY MATCH items (close match found):
  A következő tétel közeli egyezőség alapján lett kiválasztva: '[Task name]'.

===============================
FORBIDDEN
===============================

- Never invent new tasks if any catalog item could partially cover it.
- Never invent units or prices when a catalog task exists.
- Never override catalog data.
- Never skip any user-requested task.
- Never answer non-renovation related queries.

===============================
CATALOG STARTS BELOW
===============================
  
[
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Helyszíni bejárás, területfelmérés",
    "technology": "Felmérés",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 0
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Geodéziai kitűzés (alappontok, szintek)",
    "technology": "Geodéziai műszeres",
    "unit": "db",
    "laborCost": 22000,
    "materialCost": 3000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Cserjék, bokrok kézi eltávolítása",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 1800,
    "materialCost": 400
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Fű, gyomnövény kaszálása",
    "technology": "Kézi vagy gépi",
    "unit": "m²",
    "laborCost": 900,
    "materialCost": 300
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Fa kivágása (≤15 cm törzsátmérő)",
    "technology": "Kézi láncfűrészes",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 1500
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Fa kivágása (>15 cm törzsátmérő)",
    "technology": "Gépi vagy darus",
    "unit": "db",
    "laborCost": 15000,
    "materialCost": 4000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Tuskózás, gyökérmarás",
    "technology": "Gépi tuskómaró",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Humuszréteg eltávolítása és depózása",
    "technology": "Gépi",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 800
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Tereprendezés, terepszint gépi kiegyenlítése",
    "technology": "Gépi (kotró/dózer)",
    "unit": "m²",
    "laborCost": 2200,
    "materialCost": 600
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Tereprendezés kézi kiegészítés",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 1800,
    "materialCost": 500
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Töltéskészítés földmunkával",
    "technology": "Gépi",
    "unit": "m³",
    "laborCost": 6000,
    "materialCost": 1500
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Felvonulási út építése zúzottkőből",
    "technology": "Zúzottkő ágyazattal",
    "unit": "m²",
    "laborCost": 5500,
    "materialCost": 3000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Sitt, törmelék összegyűjtése",
    "technology": "Kézi",
    "unit": "m³",
    "laborCost": 6000,
    "materialCost": 800
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Hulladék elszállítása lerakóba",
    "technology": "Teherautóval",
    "unit": "m³",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Talajmechanikai vizsgálat",
    "technology": "Fúrás + labor",
    "unit": "db",
    "laborCost": 25000,
    "materialCost": 5000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Talajmechanikai szakvélemény készítése",
    "technology": "Szakértői",
    "unit": "db",
    "laborCost": 28000,
    "materialCost": 3000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Ideiglenes áramvételezési pont kiépítése",
    "technology": "Kábeles csatlakozás",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 8000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Ideiglenes vízvételi pont létesítése",
    "technology": "Csatlakozás hálózatra",
    "unit": "db",
    "laborCost": 16000,
    "materialCost": 6000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Mobil WC telepítése",
    "technology": "Vegyi WC",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 2000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Ideiglenes kerítés építése",
    "technology": "Drótfonat/OSB",
    "unit": "fm",
    "laborCost": 4000,
    "materialCost": 2000
  },
  {
    "category": "Telek előkészítése, tereprendezés",
    "task": "Kapubejáró kialakítása",
    "technology": "Fém vagy fa szerkezet",
    "unit": "db",
    "laborCost": 20000,
    "materialCost": 10000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Építési helyszín geodéziai felmérése",
    "technology": "GNSS vagy tachiméter",
    "unit": "db",
    "laborCost": 22000,
    "materialCost": 2000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Digitális domborzatmodell készítése",
    "technology": "Szoftveres modellezés",
    "unit": "db",
    "laborCost": 25000,
    "materialCost": 3000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Helyi alappont hálózat telepítése",
    "technology": "GNSS vagy prizmás mérés",
    "unit": "db",
    "laborCost": 20000,
    "materialCost": 4000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Telekhatárok kitűzése",
    "technology": "Prizmás mérés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Épület sarokpontjainak (tengelyeinek) kitűzése",
    "technology": "Tachiméterrel",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 2000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Alaptestek tengelyeinek kitűzése",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 16000,
    "materialCost": 2000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "±0,00 szintmagasság kitűzése",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Zsaluzás ellenőrző bemérése",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Falsíkok és nyílásközök bemérése",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Oszlopok, pillérek tengelyének bemérése",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Födémszint magassági ellenőrzése",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Tetőszerkezet vonalainak bemérése",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 14000,
    "materialCost": 1500
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Süllyedés- vagy mozgásvizsgálat",
    "technology": "Geodéziai monitoring",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 3000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Gépészeti vezetékek kitűzése",
    "technology": "Tachiméter",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Geodéziai mérési jegyzőkönyv készítése",
    "technology": "Digitális formátumban",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Koordináta-lista (CSV/DWG)",
    "technology": "Digitális export",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 1000
  },
  {
    "category": "Geodéziai kitűzés",
    "task": "Kivitelezői átadási dokumentáció",
    "technology": "PDF / DWG",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapozási vonal kitűzése",
    "technology": "Geodéziai műszeres kitűzés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1000
  },
   {
    "category": "Alapozási földmunka",
    "task": "Alapárok nyomvonalának jelölése",
    "technology": "Kézi karózás, festés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1000
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapárok gépi kiemelése",
    "technology": "Kotró-rakodó gép",
    "unit": "m³",
    "laborCost": 6500,
    "materialCost": 1500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapárok kézi kiemelése",
    "technology": "Kézi szerszámokkal",
    "unit": "m³",
    "laborCost": 9500,
    "materialCost": 500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Gépi földkiemelés szűk helyen",
    "technology": "Mini kotrógép",
    "unit": "m³",
    "laborCost": 7800,
    "materialCost": 800
  },
  {
    "category": "Alapozási földmunka",
    "task": "Föld szállítása depónia területére",
    "technology": "Gépi",
    "unit": "m³",
    "laborCost": 5000,
    "materialCost": 1200
  },
  {
    "category": "Alapozási földmunka",
    "task": "Föld elszállítása lerakóba",
    "technology": "Billencs teherautó",
    "unit": "m³",
    "laborCost": 7000,
    "materialCost": 3000
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapárok fenék szintezése",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 600
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapárok oldalainak kézi igazítása",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 600
  },
  {
    "category": "Alapozási földmunka",
    "task": "Vízszintes és függőleges ellenőrzés",
    "technology": "Szintező, műszer",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Alapozási földmunka",
    "task": "Ásott árok dúcolása pallóval",
    "technology": "Fa dúcolás",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 2500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alapozási munkagödör víztelenítése",
    "technology": "Szivattyú",
    "unit": "m³",
    "laborCost": 5500,
    "materialCost": 1200
  },
  {
    "category": "Alapozási földmunka",
    "task": "Talajvízszint ideiglenes süllyesztése",
    "technology": "Szivattyúzás + dréncső",
    "unit": "m³",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Alaptestek melletti visszatöltés kézi",
    "technology": "Kézi lapáttal",
    "unit": "m³",
    "laborCost": 5000,
    "materialCost": 800
  },
  {
    "category": "Alapozási földmunka",
    "task": "Visszatöltés gépi tömörítéssel",
    "technology": "Döngölő vagy vibrolap",
    "unit": "m³",
    "laborCost": 6500,
    "materialCost": 1200
  },
  {
    "category": "Alapozási földmunka",
    "task": "Réteges tömörítés vibrohengerrel",
    "technology": "Gépi",
    "unit": "m²",
    "laborCost": 3500,
    "materialCost": 1000
  },
  {
    "category": "Alapozási földmunka",
    "task": "Geodéziai bemérés alapozás után",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Alapozási földmunka",
    "task": "Földkiemelés és visszatöltés naplózása",
    "technology": "Kivitelezői dokumentáció",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Alapozás",
    "task": "Alaptestek helyének kitűzése",
    "technology": "Geodéziai eszközökkel",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Alapozás",
    "task": "Szintek kijelölése (±0,00)",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 800
  },
  {
    "category": "Alapozás",
    "task": "Sávalap zsaluzása deszkázattal",
    "technology": "Fa zsaluzat",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 2500
  },
  {
    "category": "Alapozás",
    "task": "Sávalap zsaluzása rendszerzsaluzattal",
    "technology": "Fém zsalurendszer",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 3000
  },
  {
    "category": "Alapozás",
    "task": "Sávalap vasalása (hossz- és kengyelvas)",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Alapozás",
    "task": "Sávalap betonozása mixerbetonnal",
    "technology": "C12/15 - C25/30",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Alapozás",
    "task": "Sávalap kézi betonozása",
    "technology": "Kézi keverés, vibrálás",
    "unit": "m³",
    "laborCost": 11000,
    "materialCost": 35000
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap alatti sóderágy készítése",
    "technology": "Homokos kavics tömörítve",
    "unit": "m²",
    "laborCost": 4000,
    "materialCost": 1800
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap zsaluzása szegéllyel",
    "technology": "Zsaludeszka",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap alsó vasszerelés",
    "technology": "D12-D16 betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap felső vasszerelés",
    "technology": "D12-D16 betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Alapozás",
    "task": "Távtartók, alátámasztók elhelyezése",
    "technology": "Műanyag és acél",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap betonozása mixerrel",
    "technology": "C20/25 vagy C25/30",
    "unit": "m³",
    "laborCost": 9500,
    "materialCost": 38000
  },
  {
    "category": "Alapozás",
    "task": "Lemezalap simítása géppel",
    "technology": "Betonhelikopter",
    "unit": "m²",
    "laborCost": 4000,
    "materialCost": 1500
  },
  {
    "category": "Alapozás",
    "task": "Pontalapok zsaluzása",
    "technology": "Fa vagy fém zsalu",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 1500
  },
  {
    "category": "Alapozás",
    "task": "Pontalapok vasalása",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Alapozás",
    "task": "Pontalapok betonozása",
    "technology": "C20/25",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 36000
  },
  {
    "category": "Alapozás",
    "task": "Zsalukő alap készítése",
    "technology": "Betonkitöltéssel",
    "unit": "m²",
    "laborCost": 4500,
    "materialCost": 1800
  },
  {
    "category": "Alapozás",
    "task": "Vízszigetelés alaptestre (kent)",
    "technology": "2 réteg bitumenes",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 6500
  },
  {
    "category": "Alapozás",
    "task": "Vasalási terv alapján vágás, hajlítás",
    "technology": "B500B",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
    {
    "category": "Alapozás",
    "task": "Beton vibrálása kézi tűvibrátorral",
    "technology": "Tűvibrátor",
    "unit": "óra",
    "laborCost": 9000,
    "materialCost": 1500
  },
  {
    "category": "Alapozás",
    "task": "Cementfátyol eltávolítása",
    "technology": "Mosás, súrolás",
    "unit": "m²",
    "laborCost": 3000,
    "materialCost": 600
  },
  {
    "category": "Alapozás",
    "task": "Geodéziai bemérés betonozás után",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Betonfelület tisztítása, portalanítása",
    "technology": "Kézi vagy gépi",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 600
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Felület egyenetlenségeinek kijavítása",
    "technology": "Cementhabarcs",
    "unit": "m²",
    "laborCost": 3500,
    "materialCost": 1800
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Alapozó réteg felhordása a betonra",
    "technology": "Bitumenes alapozó",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 1500
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Bitumenes lemez szigetelés (1 réteg)",
    "technology": "Lángolvasztásos",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 7500
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Bitumenes lemez szigetelés (2 réteg)",
    "technology": "Lángolvasztásos",
    "unit": "m²",
    "laborCost": 6500,
    "materialCost": 13000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Műanyag lemez szigetelés PVC/PE alapú",
    "technology": "Mechanikai vagy ragasztott",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 8000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Szigetelőlemez felhajtása függőleges felületre",
    "technology": "Bitumenes vagy PVC",
    "unit": "fm",
    "laborCost": 3000,
    "materialCost": 1500
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Szigetelés toldása átlapolással, hegesztéssel",
    "technology": "Bitumenes / hőlégfúvós",
    "unit": "fm",
    "laborCost": 3000,
    "materialCost": 1000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Sarkok, áttörések szigetelése kiegészítő elemekkel",
    "technology": "Speciális szigetelő idom",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 3000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Védőréteg elhelyezése geotextíliával",
    "technology": "200-300 g/m²",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 700
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Mechanikai védelem kialakítása XPS táblával",
    "technology": "Lépésálló XPS",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 6000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Szigetelés folytonosságának ellenőrzése",
    "technology": "Vizuális és műszeres",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Talajnedvesség elleni szigetelés",
    "task": "Beépítési napló vezetése",
    "technology": "Dokumentáció",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Terepszint mérése, szintezés előtti geodéziai bemérés",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 800
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Feltöltés rétegvastagságainak kitűzése",
    "technology": "Geodéziai vagy kézi",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 500
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Kavics feltöltés (homokos kavics, sóder)",
    "technology": "Kézi vagy gépi terítés",
    "unit": "m³",
    "laborCost": 5000,
    "materialCost": 6000
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Zúzottkő feltöltés 0-63 frakcióban",
    "technology": "Gépi terítés",
    "unit": "m³",
    "laborCost": 5000,
    "materialCost": 8000
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Durva feltöltés bontott kőanyaggal",
    "technology": "Gépi",
    "unit": "m³",
    "laborCost": 4000,
    "materialCost": 0
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Réteges tömörítés döngölőbékával",
    "technology": "Kézi gép",
    "unit": "m²",
    "laborCost": 3000,
    "materialCost": 300
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Vibrolapos tömörítés 15-30 cm rétegekben",
    "technology": "Gépi",
    "unit": "m²",
    "laborCost": 3500,
    "materialCost": 400
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Vibrohengeres tömörítés",
    "technology": "Gépi, nagyteljesítményű",
    "unit": "m²",
    "laborCost": 4000,
    "materialCost": 600
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Tömörségi fok ellenőrzése mérőműszerrel",
    "technology": "Proctor-érték alapján",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 1500
  },
  {
    "category": "Aljzatfeltöltés, tömörítés",
    "task": "Rétegrend és mennyiségek rögzítése a naplóban",
    "technology": "Kivitelezői dokumentáció",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Falazási szintek, tengelyek kitűzése",
    "technology": "Geodéziai műszeres",
    "unit": "fm",
    "laborCost": 4000,
    "materialCost": 1000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Első sor pozicionálása, szintezése",
    "technology": "Cementhabarcs ágyazat",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 2000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Porotherm 30 N+F falazat építése",
    "technology": "Falazóhabarccsal",
    "unit": "m²",
    "laborCost": 16000,
    "materialCost": 14000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Porotherm 38 K Profi falazat építése",
    "technology": "Ragasztóhabbal",
    "unit": "m²",
    "laborCost": 17000,
    "materialCost": 16000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Ytong 30 cm falazat építése",
    "technology": "Vékonyágyazatú habarcs",
    "unit": "m²",
    "laborCost": 17000,
    "materialCost": 18000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Zsalukő falazat építése 30 cm",
    "technology": "Betonkitöltéssel",
    "unit": "m²",
    "laborCost": 14000,
    "materialCost": 15000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Zsalukő falazat vasalása (hossz- és kengyelvas)",
    "technology": "B500B",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Zsalukő fal betonozása (C16/20)",
    "technology": "Mixerbeton",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Falazatba szerelődoboz, dobozfurat elhelyezése",
    "technology": "Beépítéssel",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Koszorú alatti utolsó sor vízszintezése",
    "technology": "Kézi szintezés",
    "unit": "fm",
    "laborCost": 4000,
    "materialCost": 1500
  },
  {
    "category": "Teherhordó falszerkezetek építése",
    "task": "Geodéziai bemérés falazás után",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Tengelyek és pozíciók kitűzése",
    "technology": "Geodéziai eszközökkel",
    "unit": "fm",
    "laborCost": 4000,
    "materialCost": 1000
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Zsaluzási terv értelmezése, jelölés",
    "technology": "Rajz alapján",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 1000
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Pillér zsaluzása (fa vagy fém)",
    "technology": "Zsaluépítés",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Gerenda zsaluzása (monolit)",
    "technology": "Állványzat + zsalu",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 2500
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Pillér vasalás készítése Ø12-20 mm",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Gerenda vasalás készítése Ø12-20 mm",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Kengyelek hajlítása, elhelyezése",
    "technology": "Hajlított acél",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 1500
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Pillér betonozása C20/25",
    "technology": "Mixer + tűvibrátor",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Gerenda betonozása C20/25",
    "technology": "Mixer + vibrátor",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Betonozás utáni utókezelés (locsolás, takarás)",
    "technology": "Fólia + vízpermet",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 800
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Zsaluzat bontása (pillérek, gerendák)",
    "technology": "Kézi",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Pillérek, gerendák betonozása",
    "task": "Geodéziai bemérés kivitelezés után",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Födémkontúr és szintek kitűzése",
    "technology": "Geodéziai műszeres",
    "unit": "fm",
    "laborCost": 4000,
    "materialCost": 800
  },
    {
    "category": "Födémszerkezet elkészítése",
    "task": "Födémszintek bemérése",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 800
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Monolit födém zsaluzása (fa)",
    "technology": "Hagyományos fa zsaluzat",
    "unit": "m²",
    "laborCost": 14000,
    "materialCost": 2000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Monolit födém zsaluzása (rendszer)",
    "technology": "Fém zsaluhéj rendszer",
    "unit": "m²",
    "laborCost": 15000,
    "materialCost": 3500
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Alátámasztás, dúcolás",
    "technology": "Fa vagy acél állvány",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 2500
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Monolit födém vasalása (alsó/felső)",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Hegesztett síkháló elhelyezése",
    "technology": "Q131 / Q188",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 12000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Monolit födém betonozása",
    "technology": "C20/25 mixer + vibrátor",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Felület simítása (kézi/gépi)",
    "technology": "Betonhelikopter / simító",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 800
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Utókezelés (locsolás, takarás)",
    "technology": "Fóliás takarás",
    "unit": "m²",
    "laborCost": 2500,
    "materialCost": 800
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Zsalubontás, dúcolat eltávolítása",
    "technology": "Kézi bontás",
    "unit": "m²",
    "laborCost": 4000,
    "materialCost": 800
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Födémgerendák elhelyezése",
    "technology": "Porotherm előregyártott",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 2500
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Béléstestek behelyezése",
    "technology": "Kerámia vagy beton",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 3000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Monolit vasalás elhelyezése (koszorú, monolit rész)",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Födém monolit részének betonozása",
    "technology": "C20/25",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Födémszint utólagos szintezése",
    "technology": "Kézi eszközök",
    "unit": "m²",
    "laborCost": 3000,
    "materialCost": 700
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Előregyártott födémelemek beemelése",
    "technology": "Darus beemelés",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Egyes elemek közötti monolit kitöltés",
    "technology": "C20/25 kézi/mixer",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Toldások, vasalások elhelyezése",
    "technology": "Acélbetét, távtartók",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Elemek vízszintellenőrzése",
    "technology": "Szintezőlézer",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 800
  },
  {
    "category": "Födémszerkezet elkészítése",
    "task": "Geodéziai ellenőrző bemérés",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Koszorú tengelyeinek kitűzése",
    "technology": "Geodéziai műszeres",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 2500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Zsaluzási szintek meghatározása",
    "technology": "Szintezőműszer",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Koszorú zsaluzása fa anyagból",
    "technology": "Deszka, léc, OSB",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 2500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Koszorú zsaluzása zsalu rendszerrel",
    "technology": "Fém zsaluhéj",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 3000
  },
  {
    "category": "Koszorúk készítése",
    "task": "Koszorú zsaluzat rögzítése, alátámasztása",
    "technology": "Fa vagy fém támasz",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 2500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Hosszvasak elhelyezése (Ø12-16 mm)",
    "technology": "B500B betonacél",
    "unit": "kg",
    "laborCost": 700,
    "materialCost": 600
  },
  {
    "category": "Koszorúk készítése",
    "task": "Kengyelek hajlítása, beépítése",
    "technology": "Ø6-8 mm betonacél",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 1500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Távtartók és védőréteg biztosítása",
    "technology": "Műanyag távtartó",
    "unit": "db",
    "laborCost": 6000,
    "materialCost": 2000
  },
  {
    "category": "Koszorúk készítése",
    "task": "Koszorú betonozása C20/25",
    "technology": "Mixer vagy kézi",
    "unit": "m³",
    "laborCost": 9000,
    "materialCost": 38000
  },
  {
    "category": "Koszorúk készítése",
    "task": "Beton tömörítése tűvibrátorral",
    "technology": "Vibrálás",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1500
  },
  {
    "category": "Koszorúk készítése",
    "task": "Felület simítása",
    "technology": "Kézi glettvas",
    "unit": "fm",
    "laborCost": 3000,
    "materialCost": 800
  },
  {
    "category": "Koszorúk készítése",
    "task": "Beton utókezelés (locsolás, takarás)",
    "technology": "Fólia + víz",
    "unit": "fm",
    "laborCost": 3000,
    "materialCost": 800
  },
  {
    "category": "Koszorúk készítése",
    "task": "Zsaluzat bontása",
    "technology": "Kézi",
    "unit": "fm",
    "laborCost": 3500,
    "materialCost": 800
  },
  {
    "category": "Koszorúk készítése",
    "task": "Geodéziai ellenőrzés kivitelezés után",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Tetőgeometria kitűzése, szintezése",
    "technology": "Geodéziai műszeres",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 800
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Statikai terv és faanyag egyeztetése",
    "technology": "Tervdokumentáció alapján",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 600
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Faanyag méretre vágása",
    "technology": "Gép vagy kézi",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Faanyag gomba- és tűzvédelme",
    "technology": "Felületkezelés, bemártás",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Fő tetőgerendák elhelyezése",
    "technology": "Fűrészelt gerenda",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1200
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Szarufák beépítése",
    "technology": "Fűrészelt gerenda",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1200
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Ellenlécek, fogópárok szerelése",
    "technology": "Lécezés, csavarozás",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Taréjgerenda, élgerenda, vápa beépítése",
    "technology": "Csapolt vagy csavarozott",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Torziós merevítések, keresztirányú kötés",
    "technology": "Merevítő pántolás",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Acél kapcsolók, kengyelek felszerelése",
    "technology": "Horganyzott acél",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Csavarozás, kötőelemek elhelyezése",
    "technology": "Rozsdamentes, facsavar",
    "unit": "db",
    "laborCost": 6000,
    "materialCost": 2000
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Geodéziai ellenőrzés (tengely, lejtés)",
    "technology": "Tachiméter",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 800
  },
  {
    "category": "Tetőszerkezet ácsmunkái",
    "task": "Faanyag beépítési napló készítése",
    "technology": "Dokumentáció",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 600
  },
  {
    "category": "Tetőfedés",
    "task": "Fedési terv ellenőrzése, típus meghatározás",
    "technology": "Tervdokumentáció alapján",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 600
  },
  {
    "category": "Tetőfedés",
    "task": "Tetőszerkezet vízszint- és lejtésellenőrzése",
    "technology": "Geodéziai / kézi szintezés",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 600
  },
  {
    "category": "Tetőfedés",
    "task": "Párazáró fólia fektetése",
    "technology": "Diffúz fólia, átlapolással",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 6500
  },
  {
    "category": "Tetőfedés",
    "task": "Ellenlécek elhelyezése",
    "technology": "Impregnált fa, szegelés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 800
  },
  {
    "category": "Tetőfedés",
    "task": "Tetőléc rögzítése fedési osztás szerint",
    "technology": "Faanyag, szegelés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 800
  },
  {
    "category": "Tetőfedés",
    "task": "Betoncserép fedés elhelyezése",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 6500,
    "materialCost": 7500
  },
  {
    "category": "Tetőfedés",
    "task": "Kerámiacserép fedés elhelyezése",
    "technology": "Kézi",
    "unit": "m²",
    "laborCost": 7000,
    "materialCost": 8500
  },
  {
    "category": "Tetőfedés",
    "task": "Cseréptető szellőzőcserepek, szegélyek beépítése",
    "technology": "Gyári kiegészítők",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Tetőfedés",
    "task": "Trapézlemez vagy síklemez fedés elhelyezése",
    "technology": "Csavarozott vagy rejtett rögzítés",
    "unit": "m²",
    "laborCost": 7500,
    "materialCost": 9000
  },
  {
    "category": "Tetőfedés",
    "task": "Lemezfedés szegélyezése (vápalemez, élgerinc)",
    "technology": "Hajtott bádogelemek",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 2500
  },
  {
    "category": "Tetőfedés",
    "task": "Bitumenes zsindely fedés",
    "technology": "Ragasztás és szegezés",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 7000
  },
  {
    "category": "Tetőfedés",
    "task": "Zsindelyalátét lemez fektetése",
    "technology": "Bitumenes lemez",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 4500
  },
  {
    "category": "Tetőfedés",
    "task": "Zsindely gerinc- és szegélyelemek elhelyezése",
    "technology": "Gyári elemek",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 2000
  },
  {
    "category": "Tetőfedés",
    "task": "Tetőkibúvók, kéményszegélyek beépítése",
    "technology": "Gyári szett + tömítés",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 3500
  },
  {
    "category": "Tetőfedés",
    "task": "Hófogók felszerelése",
    "technology": "Horganyzott vagy festett acél",
    "unit": "db",
    "laborCost": 7000,
    "materialCost": 2500
  },
  {
    "category": "Tetőfedés",
    "task": "Záróelemek, élgerincek beépítése",
    "technology": "Cserép vagy lemez",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 2000
  },
   {
    "category": "Tetőfedés",
    "task": "Beépítési napló készítése",
    "technology": "Dokumentáció",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 800
  },
  {
    "category": "Bádogos munkák",
    "task": "Tető éleinek felmérése, hossz bemérése",
    "technology": "Helyszíni felmérés",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 1200
  },
  {
    "category": "Bádogos munkák",
    "task": "Csatorna- és lefolyórendszer méretezése",
    "technology": "Terv és szabvány alapján",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Bádogos munkák",
    "task": "Fém ereszcsatorna felszerelése (horganyzott)",
    "technology": "Kampók, toldók",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 4500
  },
  {
    "category": "Bádogos munkák",
    "task": "Fém ereszcsatorna felszerelése (színes alumínium)",
    "technology": "Rendszerelemekkel",
    "unit": "fm",
    "laborCost": 7500,
    "materialCost": 5200
  },
  {
    "category": "Bádogos munkák",
    "task": "Műanyag ereszcsatorna szerelése",
    "technology": "Gyári idomokkal",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 3200
  },
  {
    "category": "Bádogos munkák",
    "task": "Lefolyócső felszerelése horganyzott acélból",
    "technology": "Falra rögzített",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 4200
  },
  {
    "category": "Bádogos munkák",
    "task": "Lefolyócső szerelése színes alumíniumból",
    "technology": "Szegletek, könyökök",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 5000
  },
  {
    "category": "Bádogos munkák",
    "task": "Szűkítő- és összefolyó elemek beépítése",
    "technology": "Kézi illesztés",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 2500
  },
  {
    "category": "Bádogos munkák",
    "task": "Tetőperem bádogozása (szegélylemez)",
    "technology": "Hajtott bádog",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 4200
  },
  {
    "category": "Bádogos munkák",
    "task": "Vápabádogozás beépítése",
    "technology": "Kettős hajtással",
    "unit": "fm",
    "laborCost": 7500,
    "materialCost": 4600
  },
  {
    "category": "Bádogos munkák",
    "task": "Élgerinc és falszegélyek elhelyezése",
    "technology": "Profilozott bádog",
    "unit": "fm",
    "laborCost": 7000,
    "materialCost": 4200
  },
  {
    "category": "Bádogos munkák",
    "task": "Kéményszegélyek kialakítása",
    "technology": "Speciális lemezidom",
    "unit": "db",
    "laborCost": 11000,
    "materialCost": 3500
  },
  {
    "category": "Bádogos munkák",
    "task": "Szellőző-, tetőkibúvó körüli bádogozás",
    "technology": "Kézzel hajtott",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 3200
  },
  {
    "category": "Bádogos munkák",
    "task": "Tágulási hézag bádog takarása",
    "technology": "Csúszóillesztés",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 4000
  },
  {
    "category": "Bádogos munkák",
    "task": "Vízpróba, szivárgásellenőrzés",
    "technology": "Vízzel vagy esőztetővel",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1500
  },
  {
    "category": "Bádogos munkák",
    "task": "Bádogos munkák dokumentálása, fotózás",
    "technology": "Digitális átadás",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1200
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Falnyílások ellenőrzése, méretfelvétel",
    "technology": "Lézeres vagy kézi mérés",
    "unit": "db",
    "laborCost": 20000,
    "materialCost": 1200
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Beépítési sík és magasság jelölése",
    "technology": "Geodéziai vagy kézi",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 800
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Ablak beemelése és rögzítése",
    "technology": "Téglakeretes, tokszeges",
    "unit": "db",
    "laborCost": 30000,
    "materialCost": 4000
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Bejárati ajtó beemelése és rögzítése",
    "technology": "Acél vagy műanyag",
    "unit": "db",
    "laborCost": 38000,
    "materialCost": 5000
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Erkélyajtó beépítése",
    "technology": "3 rétegű üveg, tokcsavarozás",
    "unit": "db",
    "laborCost": 42000,
    "materialCost": 9000
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Nyílászárók vízszint- és függőleges állítása",
    "technology": "Ékpárna, távtartó",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1200
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Rögzítési pontok kialakítása",
    "technology": "Tokcsavar, dűbel",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1800
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "PU habbal hézagkitöltés",
    "technology": "Alacsony tágulású",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1600
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Páraszabályzó fólia beépítése",
    "technology": "Belülre és kívülre",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1600
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Ablakpárkány előkészítés / fogadás kialakítása",
    "technology": "Habarcstömítés, síkolás",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Vízvető bádoglemez beépítése",
    "technology": "Hajtott vagy gyári",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 2200
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Tokba integrált redőnytok előkészítése",
    "technology": "Tok elhelyezés és rögzítés",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1200
  },
  {
    "category": "Külső nyílászárók beépítése",
    "task": "Beépítési jegyzőkönyv és fotódokumentáció",
    "technology": "Digitális átadás",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 800
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Nyílászárók felmérése árnyékoláshoz",
    "technology": "Méret, beépítési mélység",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 600
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Redőnytok és lefutók felszerelése",
    "technology": "Alumínium vagy műanyag",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 1800
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Kézi vagy motoros redőny beépítése",
    "technology": "Tokba szerelve",
    "unit": "db",
    "laborCost": 22000,
    "materialCost": 6000
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Zsaluzia felszerelése",
    "technology": "Motoros vezérléssel",
    "unit": "db",
    "laborCost": 28000,
    "materialCost": 8000
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Napellenző (karám vagy könyökkaros) felszerelése",
    "technology": "Falra vagy mennyezetre",
    "unit": "db",
    "laborCost": 26000,
    "materialCost": 7000
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Reluxa felszerelése",
    "technology": "Fa, alu, műanyag",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1500
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Roló, sötétítő vagy blackout függöny felszerelése",
    "technology": "Sínnel vagy rúdra",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1600
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Pliszé vagy harmonikaroló telepítése",
    "technology": "Egyedi méretre",
    "unit": "db",
    "laborCost": 14000,
    "materialCost": 2500
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Motoros árnyékolók bekötése, tesztelése",
    "technology": "Kapcsolós vagy távirányítós",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 3000
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Időzített vagy szenzoros vezérlés programozása",
    "technology": "Okosotthon rendszerrel integrálva",
    "unit": "db",
    "laborCost": 16000,
    "materialCost": 2000
  },
  {
    "category": "Árnyékolástechnika",
    "task": "Használati és karbantartási útmutató átadása",
    "technology": "Digitális vagy nyomtatott",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 800
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Helyszíni mérés, kiállások pozícióinak kijelölése",
    "technology": "Terv alapján",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 0
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Gépészeti nyomvonalak felrajzolása",
    "technology": "Falon/padlón jelölés",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 0
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Hideg-meleg víz alapvezeték kiépítése",
    "technology": "KPE vagy MÜA cső",
    "unit": "fm",
    "laborCost": 6500,
    "materialCost": 3800
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Elosztó helyek előkészítése",
    "technology": "Szerelőléc, csőidom",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Átvezetések falban, padlóban",
    "technology": "Kézi fúrás, vésés",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1200
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Szennyvíz lefolyócsövek elhelyezése",
    "technology": "PVC KG cső",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 4200
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Lejtés ellenőrzése szintezőlézerrel",
    "technology": "Műszeres",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 800
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Padlóösszefolyók, WC csatlakozás kiépítése",
    "technology": "Műanyag idomok",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 8000
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Kábeltálcák, védőcsövek fektetése",
    "technology": "MÜA cső, szerelődoboz",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Vezetékek alapcsövezése padlóban",
    "technology": "MT kábel / védőcső",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1600
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Földelés kiépítése (alaptestbe)",
    "technology": "Réz vezető szalag",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 2200
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Próbatöltés és nyomáspróba (víz)",
    "technology": "Nyomásmérő órával",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Folyáspróba (csatorna)",
    "technology": "Vízöntéses ellenőrzés",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1000
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Villamos bekötések ellenőrzése",
    "technology": "Műszeres mérés",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1200
  },
  {
    "category": "Víz-, csatorna-, villany alapszerelés",
    "task": "Dokumentáció készítése, fotózás",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1200
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Helyszín felmérése, válaszfalak kitűzése",
    "technology": "Geodéziai vagy kézi",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Csomópontok, válaszfalvégződések jelölése",
    "technology": "Terv alapján",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "10 cm-es válaszfaltégla falazása",
    "technology": "Falazóhabarccsal",
    "unit": "m²",
    "laborCost": 15000,
    "materialCost": 14000
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "12 cm-es Ytong válaszfal falazása",
    "technology": "Vékonyágyazattal",
    "unit": "m²",
    "laborCost": 16000,
    "materialCost": 15000
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Tégla válaszfal zárása födémszerkezethez",
    "technology": "Vasalt koszorú vagy PU hab",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1600
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Gipszkarton vázszerkezet építése CW/UW profilból",
    "technology": "Fémprofil szerelés",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Gipszkarton burkolat szerelése 1 réteg",
    "technology": "12,5 mm lap",
    "unit": "m²",
    "laborCost": 6500,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Gipszkarton burkolat szerelése 2 réteg",
    "technology": "2x12,5 mm lap",
    "unit": "m²",
    "laborCost": 8500,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Szigetelő gyapot behelyezése a váz közé",
    "technology": "Ásványgyapot",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 8500
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Zsalukő válaszfal építése",
    "technology": "Betonnal kiöntve",
    "unit": "m²",
    "laborCost": 14500,
    "materialCost": 2500
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Fa vázszerkezetes válaszfal borítással",
    "technology": "OSB vagy gipszrost",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Válaszfalba szerelvénydoboz, elektromos doboz elhelyezése",
    "technology": "Doboz + vágás",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 1200
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Utólagos hangszigetelés beépítése",
    "technology": "Ragasztott panel vagy szigetelőlap",
    "unit": "m²",
    "laborCost": 6500,
    "materialCost": 9000
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Válaszfalak dilatálása, csatlakozási hézag zárása",
    "technology": "Rugalmas kitöltés",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 0
  },
  {
    "category": "Belső válaszfalak építése",
    "task": "Falazási terv és fotódokumentáció",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Felület előkészítése (portalanítás, nedvesítés)",
    "technology": "Kézi, vízzel",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Vakolatháló elhelyezése saroknál, csatlakozásnál",
    "technology": "Műanyag, fém élvédő",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Belső fal kézi vakolása cementes vagy meszes vakolattal",
    "technology": "Hagyományos 2 réteg",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Belső mennyezet kézi vakolása",
    "technology": "Simított felület",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Gépi belső vakolás (1 réteg)",
    "technology": "Gépi vakológéppel",
    "unit": "m²",
    "laborCost": 8500,
    "materialCost": 1800
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Gépi belső vakolás (2 réteg)",
    "technology": "Cement-mész alapú",
    "unit": "m²",
    "laborCost": 11000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Homlokzati felület kézi vakolása",
    "technology": "Cementes vagy mész-cementes",
    "unit": "m²",
    "laborCost": 9500,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Párkányok, nyíláskeretek kézi vakolása",
    "technology": "Finomvakolat",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Homlokzati gépi vakolás",
    "technology": "Gépi felhordás + simítás",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Gépi szórt díszvakolat felhordása",
    "technology": "Színezett vagy fehér",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Vakolat javítása repedésnél, élnél",
    "technology": "Gyorsjavító vakolat",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Felületek glettelése vakolás után",
    "technology": "1-2 mm réteg",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 0
  },
  {
    "category": "Vakolás (külső és belső)",
    "task": "Felületminőség ellenőrzése, dokumentálása",
    "technology": "Digitális vagy kézi",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 0
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Fal előkészítése, portalanítás, alapozás",
    "technology": "Alapozó + tisztítás",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 1800
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Indítósín felszerelése lábazatnál",
    "technology": "Alumínium profil",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "EPS lapok ragasztása (10-15 cm)",
    "technology": "Polisztirol, sík felületre",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 2200
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Grafit EPS lapok ragasztása",
    "technology": "Javított hőszigetelés",
    "unit": "m²",
    "laborCost": 9500,
    "materialCost": 2400
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Kőzetgyapot lapok ragasztása",
    "technology": "Ásványi anyag, tűzálló",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 3500
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Hőszigetelés dűbelezése",
    "technology": "Tányéros dűbel",
    "unit": "db",
    "laborCost": 9000,
    "materialCost": 3000
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Üvegszövet háló beágyazása",
    "technology": "Alapvakolattal",
    "unit": "m²",
    "laborCost": 7000,
    "materialCost": 2000
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Sarkok, élek élvédőzése",
    "technology": "PVC élvédő",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Átvonó- és simítóréteg felhordása",
    "technology": "Cementes/gyantas kötésű",
    "unit": "m²",
    "laborCost": 7500,
    "materialCost": 2200
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Díszvakolat felhordása (kapart/rolnizott)",
    "technology": "Színezett, szilikonos",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 3500
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Homlokzati festés/védelem",
    "technology": "Vízlepergető vakolatfesték",
    "unit": "m²",
    "laborCost": 6500,
    "materialCost": 2000
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Dekorburkolat (tégla, kőlap) elhelyezése",
    "technology": "Sávos vagy teljes burkolás",
    "unit": "m²",
    "laborCost": 14000,
    "materialCost": 4500
  },
  {
    "category": "Hőszigetelés és homlokzatképzés",
    "task": "Beépítési fotódokumentáció",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Fogadófelület tisztítása, alapozás",
    "technology": "Tapadóhíd + portalanítás",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 1800
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Peremszigetelés (dilatációs szalag) elhelyezése",
    "technology": "Habcsík",
    "unit": "fm",
    "laborCost": 4500,
    "materialCost": 1800
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Kézi esztrich réteg készítése",
    "technology": "Cementes, lejtésképzéssel",
    "unit": "m²",
    "laborCost": 9500,
    "materialCost": 2500
  },
   {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Tömörítés és lehúzás kézi eszközzel",
    "technology": "Léccel, simítóval",
    "unit": "m²",
    "laborCost": 8500,
    "materialCost": 1200
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Gépi esztrich készítése keverőszivattyúval",
    "technology": "Estrich betonszivattyú",
    "unit": "m²",
    "laborCost": 13500,
    "materialCost": 4200
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Esztrich szintezése lézerrel",
    "technology": "Lézeres beállítás",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 800
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Beton simítása géppel",
    "technology": "Betonhelikopter",
    "unit": "m²",
    "laborCost": 9500,
    "materialCost": 1000
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Önterülő esztrich kiöntése",
    "technology": "Padlókiegyenlítő",
    "unit": "m²",
    "laborCost": 11500,
    "materialCost": 5000
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Tüskéshengeres buborékmentesítés",
    "technology": "Kézi szerszámmal",
    "unit": "m²",
    "laborCost": 4500,
    "materialCost": 600
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Vasalás hálóval (ha szükséges)",
    "technology": "Hegesztett acélháló",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 3500
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Védőfólia elhelyezése hőszigetelésre",
    "technology": "PE fólia",
    "unit": "m²",
    "laborCost": 5500,
    "materialCost": 7500
  },
  {
    "category": "Esztrich betonozás (aljzatbeton)",
    "task": "Szintezési jegyzőkönyv, fotó",
    "technology": "Digitális dokumentáció",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Mosdó, kézmosó csaptelep felszerelése",
    "technology": "Egykaros, flexibilis bekötés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Mosogató csaptelep és szifon szerelése",
    "technology": "Alsó szekrénybe",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Zuhany- vagy kádcsap felszerelése",
    "technology": "Falba süllyesztett vagy fali",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "WC csésze és tartály rögzítése",
    "technology": "Monoblokkos vagy rejtett",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "WC bekötése",
    "technology": "Monoblokkos vagy rejtett",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Kád bekötése",
    "technology": "Monoblokkos vagy rejtett",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Bidé csatlakoztatása",
    "technology": "Kifolyó és lefolyó bekötés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Radiátorok felszerelése",
    "technology": "Lemezes, szelep beállítás",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Konvektor bekötése",
    "technology": "Gázelzáró + csőcsatlakozás",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Padlófűtés osztó-gyűjtő egység szerelése",
    "technology": "Kompakt egység",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Csőhálózat csatlakoztatása radiátorhoz",
    "technology": "Pex vagy réz",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Kondenzációs kazán felszerelése",
    "technology": "Fali, zárt égésterű",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Gázcsatlakozó szerelése, szivárgáspróba",
    "technology": "Műszeres",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Tágulási tartály, biztonsági szelep szerelése",
    "technology": "Zárt rendszerhez",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Nyomáspróba, szivárgásvizsgálat",
    "technology": "Gépész műszerekkel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Fűtési rendszer feltöltése, légtelenítés",
    "technology": "Keringető szivattyúval",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Gépészet szerelvényezése",
    "task": "Beüzemelési jegyzőkönyv, dokumentáció",
    "technology": "Digitális átadás",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Légtechnika",
    "task": "Légtechnikai nyomvonalak kijelölése",
    "technology": "Terv alapján, födém vagy álmennyezet",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Légtechnika",
    "task": "Furatok, áttörések készítése falon/födémen",
    "technology": "Gyémántfúróval, vágással",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Légtechnika",
    "task": "Kör keresztmetszetű légcsatorna szerelése",
    "technology": "Horganyzott acél, klipszes",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Légtechnika",
    "task": "Lapos (ovális) légcsatorna szerelése",
    "technology": "Műanyag vagy alu",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Légtechnika",
    "task": "Szigetelt légcsatorna szerelése",
    "technology": "Pára- és hőszigetelt",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Légtechnika",
    "task": "Légtechnikai idomok és csatlakozók beépítése",
    "technology": "Könyök, T-idom, szűkítés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Légtechnika",
    "task": "Szabályozó szelepek, zsaluk felszerelése",
    "technology": "Manuális vagy motoros",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Légtechnika",
    "task": "Hővisszanyerős szellőztető egység beépítése",
    "technology": "Lakossági, 250–400 m³/h",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Légtechnika",
    "task": "Ventilátor vagy elszívó egység beépítése",
    "technology": "WC, fürdő, konyha",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2000
  },
  {
    "category": "Légtechnika",
    "task": "Kondenzvíz elvezetés és elektromos bekötés",
    "technology": "Szintkiegyenlítéssel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2000
  },
  {
    "category": "Légtechnika",
    "task": "Légtechnikai hálózat tesztelése, beszabályozás",
    "technology": "Műszeres légmennyiség-mérés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 3000
  },
  {
    "category": "Légtechnika",
    "task": "Dokumentáció, garanciájegyek, beüzemelési jegyzőkönyv",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 2000
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Kiállások ellenőrzése és előkészítése",
    "technology": "Dobozig, kábelvég előkészítés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Egypólusú kapcsoló beépítése",
    "technology": "Süllyesztett, sorolható",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Kétpólusú kapcsoló beépítése",
    "technology": "Fürdő vagy konyhai",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Dugalj (konnektor) felszerelése",
    "technology": "Süllyesztett, kerettel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "USB-s dugalj vagy töltőmodul beépítése",
    "technology": "Soros kivitel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Mennyezeti lámpa felszerelése",
    "technology": "Klasszikus vagy LED",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Fali lámpa, tükörvilágítás beépítése",
    "technology": "Fürdő, háló",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "LED spot vagy sínrendszer bekötése",
    "technology": "Feszültségszabályzóval",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Kapcsolók és dugaljak sorolása, keretezése",
    "technology": "Többsoros kivitel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Vezetékek ellenőrzése, érintésvédelem mérése",
    "technology": "Műszeres",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Villanyszerelés szerelvényezése",
    "task": "Áramkör beazonosítása és dokumentálása",
    "technology": "Digitális átadás",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Helyszíni biztonságtechnikai felmérés",
    "technology": "Lakás, ház, telek",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Rendszerterv és nyomvonal kijelölése",
    "technology": "Digitális, alaprajz alapján",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Mozgásérzkelők felszerelése",
    "technology": "Infravörös, 90° vagy 360°",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Kamerák hálózati bekötése és tesztelése",
    "technology": "POE vagy külön tápos",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Nyitásérzkelők felszerelése (ablak/ajtó)",
    "technology": "Mágneses érzkelő",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Biztonságtechnika",
    "task": "Riasztó központi egység és kezelőpanel bekötése",
    "technology": "Vezetékes vagy vezeték nélküli",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Beltéri és kültéri sziréna felszerelése",
    "technology": "Akkumulátorral",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "IP vagy analóg kamera felszerelése",
    "technology": "Fix vagy PTZ",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "DVR vagy NVR rögzítő telepítése",
    "technology": "4-8-16 csatornás",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Képfelvétel távoli elérésének beállítása",
    "technology": "Mobil app, internet",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Kapunyitó rendszer kiépítése",
    "technology": "Kódos vagy RFID rendszer",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Videó kaputelefon felszerelése",
    "technology": "Képernyős beltéri egységgel",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Biztonságtechnika",
    "task": "Ajtónyitó mágneszár beszerelése",
    "technology": "Kapcsolóval vagy kaputelefonnal vezérelve",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Biztonságtechnika",
    "task": "Garanciális átadás, telepítési jegyzőkönyv",
    "technology": "Digitális formában",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Okosotthon rendszer igényfelmérése és tervezés",
    "technology": "Funkciólista, alaprajzhoz igazítva",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Kábeltálcák, védőcsövek kiépítése",
    "technology": "Falon belüli vagy felületszerelt",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Központi vezérlőegység telepítése",
    "technology": "LAN/Wi-Fi, Zigbee, Z-Wave",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Okos otthoni router, switch beállítása",
    "technology": "Vezetékes hálózat, redundancia",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Okosotthon",
    "task": "Okoskapcsolók, dimmer telepítése",
    "technology": "Wi-Fi, Zigbee, falba süllyesztett",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "RGBW LED szalagok és vezérlő beépítése",
    "technology": "Rejtett világítással",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Motoros redőnyök okos vezérlésének kiépítése",
    "technology": "Időzített, szenzoros",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Okostermosztát telepítése és integrálása",
    "technology": "Zónafűtés, távvezérlés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Kazán, hűtés, szellőztés okosvezérlésének kiépítése",
    "technology": "Relés vagy digitális kommunikációval",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Okos riasztó és kamera integráció",
    "technology": "Mozgás, távriasztás, applikáció",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Okos zár, kapunyitás távoli vezérléssel",
    "technology": "Bluetooth/NFC/Wi-Fi",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Hőmérséklet, páratartalom, CO2 szenzorok elhelyezése",
    "technology": "Zigbee vagy Z-Wave",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Ajtó/ablak nyitásérzékelők okos integrációja",
    "technology": "Elemes, mágneses",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Okosotthon",
    "task": "Vízszívárgás és füstérzkelők telepítése",
    "technology": "Helyiségszinten",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Rendszer programozása, jelenetek beállítása",
    "technology": "Mobil applikációval",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Okosotthon",
    "task": "Használati oktatás, átadás dokumentációval",
    "technology": "Felhasználónak",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Belső burkolatok",
    "task": "Aljzat ellenőrzése, szintezés, alapozás",
    "technology": "Padlóra, falra",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső burkolatok",
    "task": "Fali csempeburkolat készítése (20x20 – 30x60 cm)",
    "technology": "Kézi ragasztás, fugázás",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Fali csempeburkolat készítése (60x60 cm felett)",
    "technology": "Megfogóval, síkrendszerrel",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Dekorcsempe, díszcsík, mozaik elhelyezése",
    "technology": "Finom kézi illesztés",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Padlólap ragasztása (30x30 – 45x45 cm)",
    "technology": "Kézi szintezéssel",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Fugázás, sarokszegély kialakítás",
    "technology": "Szilikon + fuga",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső burkolatok",
    "task": "Laminált padló fektetése klikkes rendszerrel",
    "technology": "Habarcs nélkül",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Alátétfólia, párazáró réteg leterítése",
    "technology": "PE fólia + alátét",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Belső burkolatok",
    "task": "Szegélyléc felhelyezése (laminált padlóhoz)",
    "technology": "Ragasztott vagy pattintott",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső burkolatok",
    "task": "Tömörfa parketta fektetése",
    "technology": "Ragasztott, illesztett",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső burkolatok",
    "task": "Parketta csiszolása és lakkozása",
    "technology": "3 réteg lakkréteg",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső burkolatok",
    "task": "Burkolási terv és kivitelezési jegyzőkönyv",
    "technology": "Digitális átadás",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Hidegburkolás",
    "task": "Padlócsempe ragasztása (20x20–60x60 cm)",
    "technology": "Hagyományos ragasztással",
    "unit": "m²",
    "laborCost": 900,
    "materialCost": 1500
  },
  {
    "category": "Hidegburkolás",
    "task": "Falicsempe ragasztása (20x20–60x60 cm)",
    "technology": "Hagyományos ragasztással",
    "unit": "m²",
    "laborCost": 9000,
    "materialCost": 1800
  },
  {
    "category": "Hidegburkolás",
    "task": "Lábazat készítése csempéből (vágással)",
    "technology": "Hagyományos ragasztással",
    "unit": "fm",
    "laborCost": 2500,
    "materialCost": 500
  },
  {
    "category": "Bontás",
    "task": "Régi hidegburkolat bontása",
    "technology": "Gépi és kézi eljárással",
    "unit": "m²",
    "laborCost": 4000,
    "materialCost": 0
  },
  {
    "category": "Festés, mázolás",
    "task": "Felületek portalanítása, glettelés",
    "technology": "1-2 réteg",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 590
  },
  {
    "category": "Festés, mázolás",
    "task": "Csiszolás, felületkiegyenlítés",
    "technology": "Gépi vagy kézi",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Festés, mázolás",
    "task": "Takarás, maszkolás ajtók, nyílászárók mentén",
    "technology": "Fólia, szalag",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Festés, mázolás",
    "task": "Belső falak festése diszperziós festékkel",
    "technology": "2 réteg, hengerrel",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Festés, mázolás",
    "task": "Belső falak festése színes festékkel",
    "technology": "2 réteg, javítással",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Festés, mázolás",
    "task": "Mennyezet festése",
    "technology": "Fehér diszperziós festék",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Festés, mázolás",
    "task": "Dekorfestés vagy struktúrált festék felvitele",
    "technology": "Kapart, hengerezett, mintás",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Festés, mázolás",
    "task": "Tapétázás, poszter elhelyezése",
    "technology": "Kézi illesztés, ragasztás",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 1800
  },
  {
    "category": "Festés, mázolás",
    "task": "Beltéri ajtók mázolása",
    "technology": "Oldószeres zománc",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Festés, mázolás",
    "task": "Ablakkeretek mázolása",
    "technology": "Két oldalon, ecsettel",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Festés, mázolás",
    "task": "Radiátor festése",
    "technology": "Hőálló zománc",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Festés, mázolás",
    "task": "Festés utáni takarítás, elszállítás",
    "technology": "Takaróanyagok + sitt",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Festés, mázolás",
    "task": "Festési napló, színkód dokumentáció",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Ajtónyílás méretének ellenőrzése, szintezése",
    "technology": "Lézeres szintmérés",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Tok behelyezése és rögzítése purhabbal",
    "technology": "Fém vagy fa tok",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Ajtószárny felszerelése a tokra",
    "technology": "Fa, CPL vagy üvegajtó",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Zár, kilincs, pántok felszerelése",
    "technology": "Alap vasalattal",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Ajtólap beállítása, finombeállítás",
    "technology": "Vízszint, csukódás",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Párkány, takaróléc felszerelése",
    "technology": "Fa, MDF vagy fóliázott",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belső ajtók beépítése",
    "task": "Beépítési jegyzőkönyv, dokumentáció",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Belsőépítészet",
    "task": "Térszervezési koncepció kialakítása",
    "technology": "3D látványterv, alaprajz",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Belsőépítészeti burkolatok (dekorpanel, falburkolat)",
    "technology": "Fa, MDF, kompozit panelek",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Álmennyezet kiépítése rejtett világítással",
    "technology": "Gipszkarton + LED sín",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Design gardébszekrény vagy tároló beépítése",
    "technology": "Egyedi, méretre szabótt",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Multifunkciós bútorok telepítése (pl. ágy+íróasztal)",
    "technology": "Modul rendszer",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Falikkp, dekorációs világítás felszerelése",
    "technology": "Csavaros vagy mágneses rögzítés",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Belsőépítészet",
    "task": "Tükör, üvegfal vagy belső tolóajtó elhelyezése",
    "technology": "Egyedi gyártás, fali rögzítéssel",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 1000
  },
  {
    "category": "Belsőépítészet",
    "task": "Hangszigetelő burkolatok elhelyezése",
    "technology": "Akusztikai panel vagy hab",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 7500
  },
  {
    "category": "Belsőépítészet",
    "task": "Vetítővászón, multimédia beépítése",
    "technology": "Falba vagy mennyezetbe",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Függönyrúd felszerelése, függöny felhelyezése",
    "technology": "Karnis és dekor anyag",
    "unit": "fm",
    "laborCost": 5000,
    "materialCost": 500
  },
  {
    "category": "Belsőépítészet",
    "task": "Belsőépítészeti látványtervek, műleírás átadása",
    "technology": "Digitális PDF, DWG",
    "unit": "db",
    "laborCost": 8000,
    "materialCost": 500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Helyszín felmérése és bútorpozíciók jelölése",
    "technology": "Terv alapján",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Alsó szekrényelemek összeállítása és szintezése",
    "technology": "Lábazat és vízszintezés",
    "unit": "fm",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Felső szekrényelemek rögzítése fali tartóra",
    "technology": "Csavarozással",
    "unit": "fm",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Munkapult elhelyezése és rögzítése",
    "technology": "Laminált, fa, kompozit",
    "unit": "fm",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Mosogató és csaptelep beépítése",
    "technology": "Kivágás, rögzítés, bekötés",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Beépíthető készülékek rögzítése (főzőlap, sütő)",
    "technology": "Elektromos/gáz csatlakozás nélkül",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Beépített gardróbszekrény összeállítása",
    "technology": "Tolóajtós vagy nyílóajtós",
    "unit": "fm",
    "laborCost": 10000,
    "materialCost": 2500
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Fürdőszobai szekrény, pult elhelyezése",
    "technology": "Fali rögzítés, vízálló",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 3000
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Ajtók, fiókok beállítása",
    "technology": "Zsanér, sín beállítás",
    "unit": "db",
    "laborCost": 18000,
    "materialCost": 3000
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Szegélylécek, záróelemek felszerelése",
    "technology": "Klipszes vagy ragasztott",
    "unit": "fm",
    "laborCost": 6000,
    "materialCost": 2000
  },
  {
    "category": "Konyhabútor, egyéb beépített bútorok",
    "task": "Beépítési dokumentáció, átadás",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Udvar szintezése, tereprendezés",
    "technology": "Földmunkagép vagy kézi",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 1500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Termőföld elterítése füvesítéshez",
    "technology": "5-15 cm vastagságban",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 3000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Füvesítés vetéssel vagy gyepszőnyeggel",
    "technology": "Gépi vető vagy gyeptéglázás",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 4000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Járdáalap készítése zúzottkőből",
    "technology": "Tömörítéssel",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 3500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Térkő burkolat lerakása",
    "technology": "6-8 cm vastagságú",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 5000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Járdaszegély beépítése",
    "technology": "Betonágyba",
    "unit": "fm",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Kocsibeálló alapozása",
    "technology": "Tükör, kavics, tömörítés",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 3500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Nehézgépjárműre alkalmas térkő burkolás",
    "technology": "Vastagított, ipari",
    "unit": "m²",
    "laborCost": 12000,
    "materialCost": 6000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Kerítésalap kiásása és betonozása",
    "technology": "30-40 cm mély",
    "unit": "fm",
    "laborCost": 8000,
    "materialCost": 3000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Kerítésoszlop beállítása, betonozása",
    "technology": "Vas vagy fa",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 4000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Kerítéselemek rögzítése",
    "technology": "Fém, fa, beton",
    "unit": "fm",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Gyalogos vagy kocsibejáró kapu felszerelése",
    "technology": "Helyszíni beállítással",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Szivárgó, vízelvezető árkok építése",
    "technology": "PVC vagy zúzottkő",
    "unit": "fm",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Külső tereprendezés, kerítés, burkolatok",
    "task": "Tereprendezési és kertépítési terv átadása",
    "technology": "Digitális",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Kertépítés",
    "task": "Talajrendezés, terepszintezés",
    "technology": "Földmunkagép vagy kézi",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 1500
  },
  {
    "category": "Kertépítés",
    "task": "Gyommentesítés, talajlazítás",
    "technology": "Rotálás, kézi ásás",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 1000
  },
  {
    "category": "Kertépítés",
    "task": "Termőföld terítése",
    "technology": "5–15 cm réteg, finom terítés",
    "unit": "m³",
    "laborCost": 10000,
    "materialCost": 8000
  },
  {
    "category": "Kertépítés",
    "task": "Fűmagvetés",
    "technology": "Gépi vagy kézi, hengerezéssel",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 2000
  },
  {
    "category": "Kertépítés",
    "task": "Gyepszőnyeg fektetése",
    "technology": "Tömörítéssel, öntözéssel",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 5000
  },
  {
    "category": "Kertépítés",
    "task": "Fák, cserjék ültetése",
    "technology": "Konténeres vagy földlabdás",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Kertépítés",
    "task": "Évelők, talajtakarók telepítése",
    "technology": "Ágyásszegély mentén",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 2000
  },
  {
    "category": "Kertépítés",
    "task": "Kerti szegély lerakása",
    "technology": "Műanyag, beton vagy fém",
    "unit": "fm",
    "laborCost": 8000,
    "materialCost": 2500
  },
  {
    "category": "Kertépítés",
    "task": "Kerti utak, díszburkolatok kialakítása",
    "technology": "Kavics, fa, térkő",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Kertépítés",
    "task": "Tó, sziklakertek, dekorációs elemek elhelyezése",
    "technology": "Kavics, díszkő, fólia",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 5000
  },
  {
    "category": "Kertépítés",
    "task": "Automata öntözőrendszer kiépítése",
    "technology": "Elektromos vezérlés + csepegtető",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Kertépítés",
    "task": "Kerti világítás kiépítése",
    "technology": "Földkábeles vagy napelemes",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 4000
  },
  {
    "category": "Kertépítés",
    "task": "Kertépítési terv, beültetési terv átadása",
    "technology": "Digitális, pdf",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Wellness létesítmények",
    "task": "Földmedence kiemelése, alapozás",
    "technology": "Gépi földmunka + kavicságy",
    "unit": "m³",
    "laborCost": 10000,
    "materialCost": 3000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Zsaluköves vagy műanyag medencetest építése",
    "technology": "Helyszíni vagy előregyártott",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Medence vízszigetelés, fóliázás",
    "technology": "PVC vagy EPDM",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 8000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Medencegépészet (szűrő, szivattyú, csövezés)",
    "technology": "Homokszűrős rendszer",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 3000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Medenceburkolat elhelyezése",
    "technology": "Mozaik, kő vagy műkő",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 5000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Jacuzzi beemelése és helyszíni beállítása",
    "technology": "Daruzás vagy kézi",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Jacuzzi elektromos és víz bekötése",
    "technology": "Kül- és beltéri",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Burkolat vagy takarás kialakítása jacuzzihoz",
    "technology": "Fa, kompozit vagy műkő",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Dézsa telepítése és vízcsatlakozás kiépítése",
    "technology": "Fatüzeléses vagy elektromos",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Dézsa burkolása, aljzat előkészítése",
    "technology": "Fakocka, térkő, beton",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Szaunakabin összeszerelése (beltéri)",
    "technology": "Finn, infra vagy kombi",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Szaunavezérlés, szaunakályha bekötése",
    "technology": "Elektromos, védett áramkör",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Hőszigetelés és pára elleni védelem kialakítása",
    "technology": "Alufólia + ásványgyapot",
    "unit": "m²",
    "laborCost": 8000,
    "materialCost": 7000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Gőzkabin beállítása, gépészet csatlakozás",
    "technology": "Beépített gőzgenerátorral",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Burkolat gőztérben (csempe/mozaik)",
    "technology": "Hőálló ragasztóval",
    "unit": "m²",
    "laborCost": 10000,
    "materialCost": 4000
  },
  {
    "category": "Wellness létesítmények",
    "task": "Beüzemelési dokumentáció, garancia jegyzőkönyv",
    "technology": "Digitális vagy nyomtatott",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1500
  },
  {
    "category": "Műszaki átadás",
    "task": "Használatbavételi engedélyhez szükséges dokumentumok összeállítása",
    "technology": "Műszaki dokumentáció, tervlapok",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Gépészeti rendszerek ellenőrzése, próbaüzem dokumentálása",
    "technology": "Fűtés, víz, elektromos",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Építési napló zárása, kivitelezői nyilatkozatok átadása",
    "technology": "Elektronikus rendszerben",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Tűzvédelmi, energetikai, statikai igazolások biztosítása",
    "technology": "Szakági dokumentumok",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Használati útmutatók, kezelési dokumentumok átadása",
    "technology": "Gépészet, beépített berendezések",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Építtetővel közös bejárás, hibajegyzék felvétele",
    "technology": "Jegyzőkönyvezve",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Hatósági bejárás koordinálása (jegyző, tűzoltóság, kormányhivatal)",
    "technology": "Ütemezés, jelenlét",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Műszaki átadás",
    "task": "Átadás-átvételi jegyzőkönyv kitöltése, aláírások",
    "technology": "Záró dokumentáció",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1000
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Végső belső takarítás (por, ragasztó, nyomok)",
    "technology": "Padozat, burkolatok, nyílászárók",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 2000
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Ablakok, ajtók teljes körű tisztítása",
    "technology": "Üvegfelületek, keretek",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 1500
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Saniterek, konyhai felületek fertőtlenítő tisztítása",
    "technology": "Mosdók, WC, munkapult",
    "unit": "db",
    "laborCost": 12000,
    "materialCost": 2000
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Külső burkolatok, járdák tisztítása",
    "technology": "Söprés, mosás",
    "unit": "m²",
    "laborCost": 6000,
    "materialCost": 1000
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Kulcsok, távirányítók, kezelőeszközök átadása",
    "technology": "Címkézett csomagolással",
    "unit": "db",
    "laborCost": 15000,
    "materialCost": 2500
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Felhasználói kézikönyv, használati utasítások átadása",
    "technology": "Fűtés, szellőzés, gépészet",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  },
  {
    "category": "Kulcsrakész átadás",
    "task": "Építtetővel bejárás, végső jegyzőkönyv",
    "technology": "Digitális aláírással",
    "unit": "db",
    "laborCost": 10000,
    "materialCost": 1500
  }
]

===============================
STRICT CATALOG USAGE POLICY
===============================

1. Matching priority (always follow this order):

a) EXACT MATCH FIRST
- Match the "task" and/or very close meaning exactly.
- If found, you MUST use it. No creativity.

b) FUZZY MATCH SECOND
- If no exact match: accept synonyms, plural/singular, minor variations,
  Hungarian diacritics differences.
- If the meaning is clearly identical, use the catalog task.

c) SPLIT IF POSSIBLE
- If the user request can be represented as multiple catalog tasks,
  ALWAYS split rather than invent new items.

d) CUSTOM ITEM ONLY IF NOTHING MATCHES
- Only if NO catalog item applies even partially.
- Otherwise it is strictly forbidden.


===============================
CUSTOM ITEM RULES
===============================

- The main offer line MUST use standard offer format (NO "custom item" or "egyedi tétel" text).
- In the "További információ" section you MUST include the following:

  A következő tétel nem volt az adatbázisban: '[Task name] (egyedi tétel)'.
  Indoklás: [why no catalog match existed].

When the user explicitly mentions replacing or installing a specific fixture or product (for example: "kád cseréje", "új fürdőkád", "mosdó csere", "WC csere", "zuhanykabin", "bojler", "kazán", "radiátor", "beltéri ajtó csere", "ablakcsere"):
- You MUST create at least one separate item line for the product itself as a material-supply type item, even if the catalog has only the installation labor.
- This product line MUST:
  - use quantity = 1 db (or another clear quantity if the text says multiple pieces),
  - have 0 Ft labor unit price and total labor (if it is purely supply),
  - have a realistic material unit price and total material cost,
  - follow the standard offer item format,
  - be treated as a CUSTOM item if no exact catalog match exists.

Example for a bathtub mentioned in the text ("kád cseréje"):
*Fürdőkád (anyag): 1 db × 0 Ft/db (díj) + 120 000 Ft/db (anyag) = 0 Ft (díj összesen) + 120 000 Ft (anyag összesen)

This product line MUST also be listed in the "További információ" section as a custom item, if it does not exist in the catalog:
A következő tétel nem volt az adatbázisban: 'Fürdőkád (anyag) (egyedi tétel)'.
Indoklás: A szövegben szerepel a kád cseréje, ezért a kád anyagköltségét külön tételként kellett szerepeltetni.


===============================
FORBIDDEN
===============================

- NEVER invent tasks that could be covered even partially by the catalog.
- NEVER invent units or prices when the catalog contains a matching task.
- NEVER override catalog data.
- NEVER ignore or skip any user-described task.
- NEVER answer non-renovation queries.


===============================
OFFER FORMAT RULES (MANDATORY)
===============================

  
When a user provides a request, always match it with the most relevant tasks from the catalog (use the input catalog marked as ===PRICE CATALOG=== if available, otherwise use the catalog in this system prompt).

When returning the generated offer text, ALWAYS start with the location/address if available in this format:

# [Location/Address]
[Extracted location information]

For each item in the offer, use the following exact format:

*[Task name]: [quantity] [unit] × [labor unit price] Ft/[unit] (díj) + [material unit price] Ft/[unit] (anyag) = [labor total] Ft (díj összesen) + [material total] Ft (anyag összesen)

- Always start the line with an asterisk (*) and a space.
- Use a colon (:) after the item name.
- Use × (multiplication sign) between quantity and unit prices.
- Always include both labor and material unit prices explicitly.
- Use "(díj)" and "(anyag)" markers after unit prices.
- After the equals sign, list both the labor total and material total, using "(díj összesen)" and "(anyag összesen)" markers.
- End each line with the total amounts in the format "123 456 Ft (díj összesen) + 78 900 Ft (anyag összesen)".

Example:
*Belső vakolat javítása: 130 m² × 3 800 Ft/m² (díj) + 500 Ft/m² (anyag) = 494 000 Ft (díj összesen) + 65 000 Ft (anyag összesen)
This format is essential for automated parsing and table rendering. Please ensure every item in the offer follows this pattern.

REMINDER: You must always include every mentioned task as a properly formatted item line, even if the task is not found in the catalog.
Do not skip, remove or omit any task — estimate a cost and add a proper line using the same format. This is MANDATORY.

**OFFERSUMMARY REQUIREMENT:**
At the end of the offer, you MUST always add an "offerSummary:" section consisting of exactly 2 sentences in Hungarian:
1. First sentence: What elements are included in the offer (list main work phases and materials)
2. Second sentence: What needs to be done overall

Example:
offerSummary: Az ajánlat tartalmazza a teljes lakásfelújítást: falak festését, parketta lerakását, fürdőszoba csempézését és elektromos munkákat. A projekt során 85 m² lakás teljes megújítására kerül sor.

**QUESTIONS TO CLARIFY REQUIREMENT:**
If any critical information is missing or uncertain (e.g. exact quantity, surface area, material quality, technology, etc.), you MUST add a "Tisztázandó kérdések:" section at the end of the offer.

In this section, list all questions that need to be answered to create an accurate offer. Each question must be:
- Specific and concrete
- End with a question mark
- Written in Hungarian
- On a separate line, numbered

Example:
Tisztázandó kérdések:
1. Mekkora a pontos alapterület négyzetméterben?
2. Milyen minőségű csempét szeretne használni (alap, prémium, vagy ügyfél biztosítja)?
3. Szükséges-e a régi burkolat elbontása is?
4. Mikor szeretné elkezdeni a munkálatokat?

**IMPORTANT:** Always generate a complete offer based on available information, BUT if information is incomplete, the "Tisztázandó kérdések:" section is MANDATORY!
`,
  model: gemini({
    model: "gemini-2.0-flash",
    defaultParameters: {
      generationConfig: {
        temperature: 0.1,
        topP: 1.0,
        topK: 1,
      },
    },
  }),
  // model: openai({
  //   model: "gpt-4o",
  //   apiKey: process.env.OPENAI_API_KEY,
  // }),
});

export const AiDemandAnalyzerAgent = createAgent({
  name: "AiDemandAnalyzerAgent",
  description:
    "AI Renovation Requirements & Demand Analyzer Agent. Returns highly detailed, structured renovation requirement analysis.",
  system: `You are an advanced AI Renovation Requirements and Demand Analyzer Agent.
Your task is to analyze renovation, remodeling, or construction requests from clients and extract all possible requirements, expectations, constraints, and missing information in a highly detailed, structured JSON format.
Answer in Hungarian language only, not English.

INPUT: You will receive a renovation request or description from a client. This could be in various formats:
1. Plain text description (e.g., "Full apartment renovation, 3 rooms and kitchen, modern style, 78 sqm, parquet flooring, energy-efficient lighting, budget 10M HUF, deadline September 2025.")
2. Text extracted from documents (PDF, DOCX, XLSX, CSV) containing renovation requirements

DOCUMENT PROCESSING INSTRUCTIONS:
- For Excel/CSV files: The data has been converted to text format. Look for structured data like tables, measurements, quantities, and specifications.
- For Word documents: The text has been extracted. Look for sections, bullet points, and formatted text that might indicate different requirements.
- For PDFs: The text has been extracted. Pay attention to layout and formatting that might indicate different sections of the requirements.

GOAL: Output a comprehensive JSON report with the following structure. Be exhaustive and precise:

IMPORTANT: Extract and fill out ALL of the following project main properties from the input text if available. These must always be present in the JSON output, using the following keys:
- project_type
- scope
- property_type
- location
- area_sqm
- rooms_affected
- budget_estimate
- timeline
- phasing

If the value is present in the input, use the exact value. Do not use 'not specified' if the information is truly missing.

For the following fields: area_sqm, budget_estimate, timeline, and phasing, always scan the entire input text for any mention of area (m², square meters), budget (Ft, HUF, EUR, etc.), timeline (dates, months, years), and phasing (stages, phases, ütemezés). If you find any relevant value, fill it in exactly as found. Only use 'not specified' if the information is truly missing from the input.

ADDITIONAL TASK:
After completing the main renovation demand analysis and JSON output, create a highly detailed, tailored proposal for the project based on the extracted requirements. This proposal must be included as a top-level key named "proposal" in the JSON output.

The "proposal" object MUST contain the following fields exactly with these names (snake_case, English only):
- main_work_phases_and_tasks (array of objects with "phase" and "tasks")
- timeline_and_scheduling_details (array of strings or a string)
- estimated_costs_per_phase_and_total: an array of objects, each containing a "phase" and a "cost" field. The array must include a final object where "phase" is "Total" and "cost" is the sum of all previous cost values in the array.
- relevant_implementation_notes_or_recommendations (array or string)
- assumptions_made (array or string)
- total_net_amount
- vat_amount
- total_gross_amount
- final_deadline
- customer_name
- customer_email
- company_name
- project_type
- scope
- property_type
- location
- area_sqm
- rooms_affected (array of strings)
- requirements (array of strings)
- client_priorities (array of strings)
- must_haves (array of strings)
- nice_to_haves (array of strings)
- budget_estimate
- timeline
- phasing
- constraints (array of strings)
- risks_or_dependencies (array of strings)
- missing_info (array of strings)
- summary_comment

Include a field in the JSON output **only if** its value is not equal to 'not specified' and not equal to 'value is missing'.
If a field's value would be 'not specified' or 'value is missing', do not include the field at all.


IMPORTANT STRUCTURE REQUIREMENTS:
- Use exactly the field names above. Do NOT use different names, capitalizations, translations, or formats.
- If the input uses a different format or language, normalize it to the above field names.
- Output must be valid JSON (no comments, no extra text).
- Be extremely thorough: infer implicit requirements, list every detail, and never omit possible client needs.
- Only analyze renovation-related content.
- Always include: total_net_amount, vat_amount, total_gross_amount, final_deadline, relevant_implementation_notes_or_recommendations, and assumptions_made fields.
- Maintain a professional, supportive, and efficient tone at all times.
- Always attempt to provide values, but if a field ends up with 'not specified' or 'value is missing', do not include it in the output.
`,
  model: gemini({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
  }),
});

export const AIRoadmapGeneratorAgent = createAgent({
  name: "AIRoadmapGeneratorAgent",
  description: "Generate Details Tree Like Flow Roadmap",
  system: `Generate a React flow tree-structured learning roadmap for user input position/ skills in the following format:
 vertical tree structure with meaningful x/y positions to form a flow
- Structure should be similar to roadmap.sh layout
- Steps should be ordered from fundamentals to advanced
- Include branching for different specializations (if applicable)
- Each node must have a title, short description, and learning resource link
- Use unique IDs for all nodes and edges
- Add some extra space between two nodes
- Give me node sturcture position in tree format
- make it more specious node position, 
- Response n JSON format
{
  roadmapTitle:'',
  description:<3-5 Lines>,
  duration:'',
  initialNodes : [
  {
    id: '1',
    type: 'turbo',// Type turbo only everytime
    position: { x: 0, y: 0 },
    data: {
      title: 'Step Title',
      description: 'Short two-line explanation of what the step covers.',
      link: 'Helpful link for learning this step',
    },
  },
  ...
],
initialEdges : [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
  ...
];
}
User Input: Fronted Developer`,
  model: gemini({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
  }),
});

export const AiOfferAgent = inngest.createFunction(
  { id: "AiOfferAgent" },
  { event: "AiOfferAgent" },
  async ({ event, step }) => {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 [AiOfferAgent] STARTED");
    console.log("=".repeat(80));
    console.log("📥 Event data:", JSON.stringify(event, null, 2));
    console.log("⏰ Timestamp:", new Date().toISOString());

    try {
      const { userInput, recordId, userEmail, existingItems = [] } = event.data;
      console.log("\n📋 [STEP 1] Parsing event data...");
      console.log("  ├─ userInput length:", userInput?.length || 0, "chars");
      console.log("  ├─ recordId:", recordId);
      console.log("  ├─ userEmail:", userEmail);
      console.log("  └─ existingItems:", existingItems.length, "items");

      if (!userInput) {
        console.error("❌ [ERROR] userInput is missing!");
        throw new Error("Missing userInput in event data");
      }
      console.log("✅ [STEP 1] Event data parsed successfully");

      console.log("\n📝 [STEP 2] Building base input...");
      console.log("=== AI AGENT - EXISTING ITEMS DEBUG ===");
      console.log("existingItems:", existingItems);
      console.log("existingItems length:", existingItems.length);
      console.log(
        "existingItems content:",
        JSON.stringify(existingItems, null, 2)
      );
      console.log("=== AI AGENT - USER INPUT ===");
      console.log("userInput FULL TEXT:");
      console.log(userInput);
      console.log("---");
      console.log("userInput length:", userInput?.length || 0);
      console.log("userInput first 500 chars:", userInput?.substring(0, 500));
      console.log(
        "userInput last 500 chars:",
        userInput?.substring(userInput.length - 500)
      );
      console.log("======================================");

      const baseInput =
        existingItems.length > 0
          ? `${userInput}\n\nMeglévő tételek (ne vegyél fel ismétlődést):\n${JSON.stringify(existingItems, null, 2)}`
          : userInput;
      console.log("  └─ baseInput length:", baseInput.length, "chars");
      console.log("✅ [STEP 2] Base input built");

      if (existingItems.length > 0) {
        console.log("✅ Base input INCLUDES existing items");
      } else {
        console.log(
          "⚠️ Base input does NOT include existing items (empty array)"
        );
      }

      console.log("\n🔍 [STEP 3] RAG Context Enhancement...");
      console.log("  ├─ RAG_ENABLED:", process.env.RAG_ENABLED || "undefined");
      let finalInput = baseInput;

      if (process.env.RAG_ENABLED === "true") {
        try {
          console.log("  ├─ RAG is enabled, enhancing prompt...");
          const ragEnhancedInput = await enhancePromptWithRAG(
            baseInput,
            userInput,
            true
          );
          finalInput = ragEnhancedInput;
          console.log("  └─ RAG enhancement successful");
          console.log("✅ [STEP 3] RAG context added");
        } catch (ragError) {
          console.error("  └─ RAG error:", ragError);
          console.log("⚠️ [STEP 3] RAG failed, using original input");
          finalInput = baseInput;
        }
      } else {
        console.log("  └─ RAG is disabled, skipping");
        console.log("✅ [STEP 3] Using base input (RAG disabled)");
      }

      console.log("\n📚 [STEP 4] Loading PriceList Catalog...");
      const { priceListCatalog, catalogSource } = await step.run(
        "load-pricelist-catalog",
        async () => {
          console.log("  ├─ Fetching catalog from database...");
          const catalog = await getPriceListCatalog();
          console.log("  ├─ Catalog fetched, length:", catalog.length, "chars");

          const catalogIsEmpty = catalog === "[]" || catalog.trim() === "";
          let source = "";

          if (catalogIsEmpty) {
            source = "⚠️ FALLBACK (system prompt JSON)";
            console.log("  ├─ ⚠️ Catalog is empty, using fallback");
          } else {
            const catalogItems = JSON.parse(catalog);
            source = `✅ PRIMARY (adatbázis - ${catalogItems.length} tétel)`;
            console.log(
              "  ├─ ✅ Catalog loaded:",
              catalogItems.length,
              "items"
            );
          }

          console.log("  └─ Source:", source);
          return { priceListCatalog: catalog, catalogSource: source };
        }
      );

      console.log("✅ [STEP 4] Catalog loaded:", catalogSource);

      console.log("\n🔗 [STEP 5] Appending catalog to input...");
      finalInput = `${finalInput}\n\n===PRICE CATALOG===\n${priceListCatalog}`;
      console.log("  └─ Final input length:", finalInput.length, "chars");
      console.log("✅ [STEP 5] Input prepared for AI");

      console.log("\n🤖 [STEP 6] Calling AI Agent (Gemini 2.0 Flash)...");
      console.log("  ├─ Model: gemini-2.0-flash");
      console.log("  ├─ Max retries: 3");
      console.log("  └─ Checking GEMINI_API_KEY...");

      // API Key ellenőrzés
      const hasGeminiKey = !!process.env.GEMINI_API_KEY;
      console.log("  └─ GEMINI_API_KEY present:", hasGeminiKey);
      if (!hasGeminiKey) {
        console.error("❌ [CRITICAL ERROR] GEMINI_API_KEY is missing!");
        console.error("   Please set GEMINI_API_KEY in environment variables");
        throw new Error("GEMINI_API_KEY is not configured");
      }

      let retries = 3;
      let result;
      let lastError;

      while (retries > 0) {
        try {
          const attemptNum = 4 - retries;
          console.log(`\n  🔄 Attempt ${attemptNum}/3...`);
          console.log("  ├─ Sending request to Gemini API...");

          const startTime = Date.now();
          result = await AiOfferChatAgent.run(finalInput);
          const duration = Date.now() - startTime;

          console.log("  ├─ ✅ Response received in", duration, "ms");
          console.log("  └─ Response type:", typeof result);
          console.log("✅ [STEP 6] AI agent response successful");
          break;
        } catch (error: any) {
          lastError = error;
          console.error("  └─ ❌ Request failed:", error?.message || error);
          console.error("     Error details:", {
            status: error?.status,
            code: error?.code,
            message: error?.message,
            stack: error?.stack?.split("\n")[0],
          });

          const is429 =
            error?.status === 429 ||
            error?.message?.includes("429") ||
            error?.message?.includes("rate limit");

          if (is429 && retries > 1) {
            const waitTime = 60;
            console.log(`  ⚠️ Rate limit detected, waiting ${waitTime}s...`);
            console.log(`  └─ Retries left: ${retries - 1}`);
            await new Promise((resolve) =>
              setTimeout(resolve, waitTime * 1000)
            );
            retries--;
          } else {
            console.error("❌ [STEP 6] AI agent call failed permanently");
            throw error;
          }
        }
      }

      if (!result) {
        console.error("❌ [CRITICAL ERROR] No result after 3 attempts");
        console.error("   Last error:", lastError);
        throw lastError || new Error("AI agent returned no result");
      }

      console.log("\n📋 [STEP 7] Parsing AI Response...");
      console.log("  ├─ Result type:", typeof result);
      console.log("  ├─ Result keys:", Object.keys(result || {}).join(", "));
      console.log("=== AI AGENT - RESPONSE DEBUG ===");
      console.log("Full AI response:");
      console.log(JSON.stringify(result, null, 2));
      console.log("================================");
      console.log("  └─ Full result:");
      console.log(JSON.stringify(result, null, 2).substring(0, 1000) + "...");

      console.log("\n📦 [STEP 8] Analyzing response structure...");
      if (result && result.output && Array.isArray(result.output)) {
        console.log("  ├─ Output is array with", result.output.length, "items");
        result.output.forEach((item, index) => {
          console.log(`  ├─ Output[${index}]:`, {
            type: typeof item,
            keys: Object.keys(item || {}).join(", "),
            hasContent: "content" in item,
          });

          if (
            "content" in item &&
            item.content &&
            typeof item.content === "string"
          ) {
            const contentPreview = item.content.substring(0, 300);
            console.log(
              `  ├─ Content preview (${item.content.length} chars):`,
              contentPreview + "..."
            );

            const offerSummaryMatch = item.content.match(
              /offerSummary:\s*([^\n]+(?:\n[^\n]+)?)/i
            );
            if (offerSummaryMatch) {
              console.log(
                "  ├─ 🎯 Found offerSummary:",
                offerSummaryMatch[1].substring(0, 100)
              );
            } else {
              console.log("  ├─ ⚠️ offerSummary not found in content");
            }
          } else {
            console.log("  ├─ ❌ No content property in item");
          }
        });
        console.log("  └─ Analysis complete");
        console.log("✅ [STEP 8] Response structure analyzed");
      } else {
        console.log("  └─ ❌ No output array found in result");
        console.log("⚠️ [STEP 8] Unexpected response structure");
      }

      console.log("\n💾 [STEP 9] Saving to database...");
      if (recordId) {
        console.log("  ├─ recordId:", recordId);

        // 1. History táblába mentés
        await step.run("save-offer-history", async () => {
          const historyData = {
            recordId: recordId,
            content: JSON.parse(JSON.stringify(result)),
            tenantEmail: userEmail,
            aiAgentType: "ai-offer-letter",
            metaData: {
              title: "Ajánlat generálás",
              description: userInput.substring(0, 100) + "...",
              existingItems:
                existingItems.length > 0 ? existingItems : undefined,
            },
            createdAt: new Date().toISOString(),
          };

          console.log("  ├─ Preparing history data...");
          console.log("  ├─ tenantEmail:", userEmail);
          console.log("  ├─ aiAgentType: ai-offer-letter");
          console.log(
            "  ├─ content size:",
            JSON.stringify(result).length,
            "chars"
          );

          try {
            const saved = await prisma.history.create({
              data: historyData,
            });
            console.log("  ├─ ✅ Saved to History, ID:", saved.id);
            console.log("  └─ Created at:", saved.createdAt);
            return saved;
          } catch (dbError) {
            console.error("  └─ ❌ History save failed:", dbError);
            throw dbError;
          }
        });

        // 2. Offer táblába mentés KIHAGYVA - a frontend fogja menteni
        console.log(
          "  ├─ ⚠️ Skipping Offer table save (frontend will handle it)"
        );
        console.log(
          "✅ [STEP 9] AI generation complete, waiting for frontend to save"
        );
      } else {
        console.log("  └─ ⚠️ No recordId, skipping database save");
        console.log("⚠️ [STEP 9] Skipped (no recordId)");
      }

      console.log("\n" + "=".repeat(80));
      console.log("🎉 [AiOfferAgent] COMPLETED SUCCESSFULLY");
      console.log("=".repeat(80));
      console.log("⏰ Finished at:", new Date().toISOString());
      console.log("📊 Result size:", JSON.stringify(result).length, "chars");

      return result;
    } catch (error: any) {
      console.log("\n" + "=".repeat(80));
      console.error("💥 [AiOfferAgent] FAILED");
      console.log("=".repeat(80));
      console.error("❌ Error type:", error?.constructor?.name || typeof error);
      console.error("❌ Error message:", error?.message || error);
      console.error("❌ Error code:", error?.code);
      console.error("❌ Error status:", error?.status);
      console.error("❌ Stack trace:");
      console.error(error?.stack);
      console.log("=".repeat(80));
      throw error;
    }
  }
);

var imagekit = new ImageKit({
  //@ts-ignore
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  //@ts-ignore
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  //@ts-ignore
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT_URL,
});

export const AiDemandAgent = inngest.createFunction(
  { id: "AiDemandAgent" },
  { event: "AiDemandAgent" },
  async ({ event, step }) => {
    const {
      recordId,
      base64DemandFile,
      fileText,
      fileType,
      fileName,
      aiAgentType,
      userEmail,
    } = await event.data;

    // Determine file extension from fileType or fileName
    const getFileExtension = () => {
      if (fileType) {
        if (fileType.includes("pdf")) return "pdf";
        if (fileType.includes("wordprocessingml")) return "docx";
        if (fileType.includes("spreadsheetml") || fileType.includes("excel"))
          return "xlsx";
        if (fileType === "text/csv") return "csv";
      }
      // Fallback to file extension if fileType is not specific enough
      if (fileName) {
        const parts = fileName.split(".");
        if (parts.length > 1) return parts.pop()?.toLowerCase();
      }
      return "bin"; // Default extension
    };

    const fileExtension = getFileExtension();

    // Upload file to Cloud
    const uploadFileUrl = await step.run("uploadFile", async () => {
      const imageKitFile = await imagekit.upload({
        file: base64DemandFile,
        fileName: `${Date.now()}.${fileExtension}`,
        isPublished: true,
      });
      return imageKitFile.url;
    });

    // Process the file text with the AI agent
    const aiDemandReport = await AiDemandAnalyzerAgent.run(fileText);

    // Process the AI response
    // @ts-ignore
    const rawContent = aiDemandReport.output[0].content;
    let parseJson;

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
      parseJson = JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON from AI response:", error);
      // If parsing fails, wrap the content in a generic response
      parseJson = {
        error: "Failed to parse AI response",
        raw_content: rawContent,
        file_type: fileType,
        file_name: fileName,
      };
    }

    // Save to DB
    const saveToDb = await step.run("SaveToDb", async () => {
      const result = await prisma.history.create({
        data: {
          recordId: recordId,
          content: parseJson,
          aiAgentType: aiAgentType,
          createdAt: new Date().toISOString(),
          userEmail: userEmail,
          metaData: JSON.stringify({
            fileUrl: uploadFileUrl,
            fileType: fileType,
            fileName: fileName,
          }),
          tenantEmail: userEmail,
        },
      });
      console.log("Saved to DB:", result, parseJson);
      return parseJson;
    });
  }
);

export const AiRoadmapAgent = inngest.createFunction(
  { id: "AiRoadMapAgent" },
  { event: "AiRoadMapAgent" },
  async ({ event, step }) => {
    const { roadmapId, userInput, userEmail } = await event.data;

    const roadmapResult = await AIRoadmapGeneratorAgent.run(
      "UserInput:" + userInput
    );

    // return roadmapResult

    // @ts-ignore
    const rawContent = roadmapResult.output[0].content;

    // ✅ Extract JSON inside ```json ... ```
    const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/);

    if (!match || !match[1]) {
      throw new Error("JSON block not found in the content");
    }

    const rawContentJson = match[1].trim(); // Remove leading/trailing whitespace

    const parsedJson = JSON.parse(rawContentJson); // ✅ Safely parsed
    //Save to DB
    //Save to DB
    const saveToDb = await step.run("SaveToDb", async () => {
      const historyData = {
        recordId: roadmapId,
        content: parsedJson as any, // Type assertion for Prisma JSON field
        aiAgentType: "/ai-tools/ai-roadmap-agent",
        createdAt: new Date().toISOString(),
        userEmail: userEmail || "anonymous@example.com",
        tenantEmail: userEmail || "anonymous@example.com",
        metaData:
          typeof userInput === "string" ? { content: userInput } : userInput,
      };

      console.log(
        "Saving roadmap to history:",
        JSON.stringify(historyData, null, 2)
      );

      const result = await prisma.history.create({
        data: historyData,
      });

      console.log("Saved roadmap history record:", result);
      console.log(result);
      return parsedJson;
    });
  }
);

interface EmailAnalysis {
  analysis?: {
    sender_intent?: string | null;
    main_topic?: string | null;
    key_points?: string[] | null;
    action_required?: boolean;
    priority?: "high" | "medium" | "low" | null;
    deadline?: string | null;
    related_to?: "renovation" | "offer" | "inquiry" | "other" | null;
    sentiment?: "positive" | "neutral" | "negative" | null;
    contact_info?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
    requirements?: {
      type?: string[] | null;
      description?: string | null;
      preferences?: string[] | null;
    };
    attachments?: {
      present?: boolean;
      types?: string[] | null;
      purpose?: string | null;
    };
    follow_up?: {
      needed?: boolean;
      when?: string | null;
      action_items?: string[] | null;
    };
  };
  summary?: {
    overview?: string;
    next_steps?: string[];
  };
  metadata?: {
    language?: string | null;
    length?: number;
    analysis_timestamp?: string;
  };
}

export const ProcessBulkEmails = inngest.createFunction(
  { id: "process-bulk-emails" },
  { event: "ProcessBulkEmails" },
  async ({ event, step }) => {
    console.log("ProcessBulkEmails function started");
    const { userEmail } = event.data;

    try {
      // Find all emails without a myWorkId and with content
      const emails = await step.run("GetEmailsWithoutWork", async () => {
        return await prisma.$queryRaw<
          Array<{
            id: number;
            subject: string;
            content: string;
            from: string;
            // Add other fields from your Email model as needed
          }>
        >`
          SELECT * FROM "Email"
          WHERE "myWorkId" IS NULL
          AND "tenantEmail" = ${userEmail}
          AND "content" IS NOT NULL
          AND "content" != ''
          ORDER BY "createdAt" DESC
        `;
      });

      console.log(`Found ${emails.length} emails to process`);

      // Process each email
      for (const email of emails) {
        if (!email.content) {
          console.log(`Skipping email ${email.id} - no content`);
          continue;
        }

        try {
          console.log(
            `Processing email: ${email.id} - ${email.subject || "No subject"}`
          );

          // Run the EmailAnalyzerAgent outside of step.run
          const emailContent = email.content as string;
          console.log(
            `Analyzing email ${email.id} (${email.subject || "No subject"})`
          );

          let analysisResult: EmailAnalysis = {
            analysis: {},
            summary: { overview: "", next_steps: [] },
          };

          try {
            const result = await EmailAnalyzerAgent.run(emailContent);
            const firstMessage = result.output?.[0];
            let rawContent: string | undefined;

            if (firstMessage && "content" in firstMessage) {
              // Handle regular message with content
              rawContent = firstMessage.content as string;
            } else if (firstMessage && "tool_call_id" in firstMessage) {
              // Handle tool call message
              console.error(
                "Received tool call message, but expected text content"
              );
              analysisResult = {
                analysis: {},
                summary: {
                  overview: "Error: Tool call not supported here",
                  next_steps: [],
                },
              };
            }

            if (rawContent) {
              // Try to extract JSON from markdown code blocks
              try {
                let jsonString = rawContent;

                // Try to find JSON in markdown code blocks
                const jsonMatch = rawContent.match(
                  /```(?:json)?\s*([\s\S]*?)\s*```/
                );
                if (jsonMatch) {
                  jsonString = jsonMatch[1];
                }

                // Clean up the string before parsing
                jsonString = jsonString.trim();

                // If the response starts with a non-JSON text, try to find the actual JSON part
                if (
                  !jsonString.startsWith("{") &&
                  !jsonString.startsWith("[")
                ) {
                  const jsonStart = jsonString.indexOf("{");
                  if (jsonStart > 0) {
                    jsonString = jsonString.substring(jsonStart);
                  }
                }

                // Try to parse the JSON
                analysisResult = JSON.parse(jsonString) as EmailAnalysis;
                console.log("Successfully parsed analysis result");
              } catch (error) {
                console.error(
                  `Error parsing analysis for email ${email.id}:`,
                  error
                );
                console.log(
                  "Raw content that failed to parse:",
                  rawContent.substring(0, 500)
                );
                analysisResult = {
                  analysis: {},
                  summary: {
                    overview:
                      "Hiba az elemzés feldolgozásakor. Kérjük, ellenőrizd az e-mail tartalmát.",
                    next_steps: [],
                  },
                };
              }
            }
          } catch (error) {
            console.error(
              `Error running EmailAnalyzerAgent for email ${email.id}:`,
              error
            );
            analysisResult = {
              analysis: {},
              summary: { overview: "Error analyzing email", next_steps: [] },
            };
          }

          // Extract location from email content or subject
          const location =
            email.subject
              ?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]
              ?.trim() ||
            (typeof email.content === "string"
              ? email.content
                  .match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]
                  ?.trim()
              : "") ||
            analysisResult.analysis?.requirements?.description
              ?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]
              ?.trim() ||
            "Ismeretlen helyszín";

          // Create or find MyWork item
          await step.run(`CreateOrUpdateMyWork-${email.id}`, async () => {
            const emailSubject = email.subject || "Névtelen munka";
            const fromText = email.from || "Ismeretlen feladó";
            const emailContent = email.content || "";

            // Extract customer name and email from the from field
            const customerName =
              fromText.split("<")[0]?.trim() || "Ismeretlen ügyfél";
            const customerEmailMatch = fromText.match(/<([^>]+)>/);
            const customerEmail = customerEmailMatch
              ? customerEmailMatch[1]
              : "";

            // Create a description with the first 200 chars of the email
            const emailPreview =
              emailContent.length > 200
                ? `${emailContent.substring(0, 200)}...`
                : emailContent;
            const description = `E-mail kapcsolat: ${fromText}\n\n${emailPreview}`;

            // Build the where clause for finding existing work
            const whereClause: any = {
              tenantEmail: userEmail,
              OR: [] as any[],
            };

            // Only add title condition if email has a subject
            if (email.subject) {
              whereClause.OR.push({ title: email.subject });
            }

            // Always include location in the OR condition
            whereClause.OR.push({
              location: { equals: location, mode: "insensitive" },
            });

            // Find existing work that matches either title or location
            const existingWork = await prisma.myWork.findFirst({
              where: whereClause,
              orderBy: { createdAt: "desc" }, // Get the most recent one
            });

            if (existingWork) {
              // Update existing MyWork
              await prisma.myWork.update({
                where: { id: existingWork.id },
                data: {
                  description: description,
                  // Only update customer info if it's not set
                  customerName: existingWork.customerName || customerName,
                  customerEmail: existingWork.customerEmail || customerEmail,
                  // Update location if it was empty
                  location: existingWork.location || location,
                },
              });

              // Link email to existing MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: existingWork.id },
              });

              console.log(
                `Linked email ${email.id} to existing MyWork ${existingWork.id}`
              );
              return { action: "linked", workId: existingWork.id };
            } else {
              // Create new MyWork with data from email and analysis
              const newWorkData: any = {
                title: emailSubject,
                customerName: customerName,
                customerEmail: customerEmail,
                date: new Date(),
                location: location,
                time: "00:00",
                totalPrice: 0,
                description: description,
                tenantEmail: userEmail,
                workflowId: null,
                // Add additional fields from analysis if available
                customerPhone:
                  analysisResult.analysis?.contact_info?.phone || null,
              };

              const newWork = await prisma.myWork.create({
                data: newWorkData,
              });

              // Link email to the new MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: newWork.id },
              });

              console.log(
                `Created new MyWork ${newWork.id} for email ${email.id}`
              );
              return { action: "created", workId: newWork.id };
            }
          });
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          // Continue with next email even if one fails
          continue;
        }
      }

      return { success: true, processedCount: emails.length };
    } catch (error) {
      console.error("Error in ProcessBulkEmails:", error);
      throw error;
    }
  }
);

export const EmailAnalyzer = inngest.createFunction(
  { id: "EmailAnalyzer" },
  { event: "EmailAnalyzer" },
  async ({ event, step }) => {
    console.log("EmailAnalyzer function started", { eventId: event.id });
    const { recordId, emailContent, userEmail, metadata = {} } = event.data;
    console.log("Processing analysis for recordId:", recordId);

    try {
      // Analyze the email content using the EmailAnalyzerAgent
      console.log("Running EmailAnalyzerAgent...");
      const analysisResult = await EmailAnalyzerAgent.run(emailContent);
      console.log("EmailAnalyzerAgent completed");

      // @ts-ignore
      const rawContent = analysisResult.output[0].content;
      console.log("Raw analysis content length:", rawContent.length);
      console.log(
        "Raw analysis content (first 500 chars):",
        rawContent.substring(0, 500)
      );

      // Try to extract JSON from markdown code blocks
      let parsedAnalysis;
      try {
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
        console.log(
          "Extracted JSON string (first 500 chars):",
          jsonString.substring(0, 500)
        );

        parsedAnalysis = JSON.parse(jsonString);
        console.log(
          "Successfully parsed JSON analysis:",
          JSON.stringify(parsedAnalysis, null, 2)
        );
      } catch (error) {
        console.error("Error parsing JSON from email analysis:", error);
        // If parsing fails, include the raw content for debugging
        parsedAnalysis = {
          error: "Failed to parse email analysis",
          raw_content:
            rawContent?.substring(0, 500) +
            (rawContent?.length > 500 ? "..." : ""),
          ...metadata,
        };
        console.log("Fallback analysis content:", parsedAnalysis);
      }

      // Save the analysis to the database using Prisma
      const saveToDb = await step.run("SaveEmailAnalysis", async () => {
        try {
          console.log(
            "Attempting to save to database with recordId:",
            recordId
          );
          console.log(
            "Analysis content to save:",
            JSON.stringify(parsedAnalysis, null, 2)
          );

          const data = {
            recordId: recordId,
            content: parsedAnalysis,
            aiAgentType: "/ai-tools/email-analyzer",
            userEmail: userEmail,
            metaData: JSON.stringify({
              ...metadata,
              analysis_timestamp: new Date().toISOString(),
            }),
            tenantEmail: userEmail, // Make sure tenantEmail is set
            createdAt: new Date().toISOString(),
          };

          console.log("Database insert data:", JSON.stringify(data, null, 2));

          const result = await prisma.history.create({
            data: data,
          });

          console.log("Email analysis saved to DB:", {
            recordId: recordId,
            dbId: result.id,
            savedAt: new Date().toISOString(),
          });

          // Verify the record was saved
          const savedRecord = await prisma.history.findUnique({
            where: { id: result.id },
          });
          console.log("Verified saved record:", {
            id: savedRecord?.id,
            recordId: savedRecord?.recordId,
            aiAgentType: savedRecord?.aiAgentType,
            hasContent: !!savedRecord?.content,
          });

          return parsedAnalysis;
        } catch (error) {
          console.error("Error saving to database:", error);
          throw error;
        }
      });

      return { success: true, analysis: parsedAnalysis };
    } catch (error) {
      console.error("Error in EmailAnalyzer:", error);
      throw error;
    }
  }
);
