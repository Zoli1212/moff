import { inngest } from "./client";
import { createAgent, gemini, openai } from "@inngest/agent-kit";
import { PrismaClient } from "@prisma/client";
import ImageKit from "imagekit";

const prisma = new PrismaClient();


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
  You assist only company employees in preparing accurate, detailed offers for clients.
  
  You do **not** communicate with clients directly.
  
  Your tasks include:
  - Helping staff generate professional renovation offers based on the company's services and price list.
  - Clarifying all missing information needed for offer creation. For example:
    - Surface area or quantity (m², number of doors, etc.)
    - Location of work (kitchen, bathroom, exterior, etc.)
    - Type of work (painting, tiling, demolition, installation, etc.)
    - Required materials or material grade (basic, premium, customer-provided, etc.)
  - If the necessary data is missing and not available from the database, always ask the staff for clarification.
  - If a predefined price list is available, use it to calculate the estimated total.
  - If prices or tasks are not provided, you may help staff prepare a structure or checklist they can complete manually.
  - If the staff requests or describes a task that does not exist in the provided catalog, you may still include it in the tasks list using the same structure as the other items.

You must clearly indicate in the additionalInfo section at the end of the response which task(s) were not found in the original catalog.

**Example "További információ: " content:**
> "A következő tétel nem volt az adatbázisban: 'High-pressure facade cleaning (custom item)'."

---
  
Use the following detailed renovation task list as your catalog when generating offers or asking clarifying questions.
  
  Each task has the following structure:
  {
    category: string,         // Szakági kategória, pl.: "Szerkezetépítés"
    task: string,             // Feladat neve magyarul, pl.: "Falazás téglából"
    technology: string,       // Technológia / anyag típusa
    unit: string,             // Egység, pl.: "m²", "fm", "db"
    laborCost: number,        // Átlagos munkadíj nettó Ft/egység
    materialCost: number      // Anyagdíj nettó Ft/egység
  }
  
  Here is the complete catalog of tasks you must use when answering:
  
  [
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Helyszíni bejárás, területfelmérés",
      "technology": "Felmérés",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Geodéziai kitűzés (alappontok, szintek)",
      "technology": "Geodéziai műszeres",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Cserjék, bokrok kézi eltávolítása",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Fű, gyomnövény kaszálása",
      "technology": "Kézi vagy gépi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Fa kivágása (≤15 cm törzsátmérő)",
      "technology": "Kézi láncfűrészes",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Fa kivágása (>15 cm törzsátmérő)",
      "technology": "Gépi vagy darus",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Tuskózás, gyökérmarás",
      "technology": "Gépi tuskómaró",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Humuszréteg eltávolítása és depózása",
      "technology": "Gépi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Tereprendezés, terepszint gépi kiegyenlítése",
      "technology": "Gépi (kotró/dózer)",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Tereprendezés kézi kiegészítés",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Töltéskészítés földmunkával",
      "technology": "Gépi",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Felvonulási út építése zúzottkőből",
      "technology": "Zúzottkő ágyazattal",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Sitt, törmelék összegyűjtése",
      "technology": "Kézi",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Hulladék elszállítása lerakóba",
      "technology": "Teherautóval",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Talajmechanikai vizsgálat",
      "technology": "Fúrás + labor",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Talajmechanikai szakvélemény készítése",
      "technology": "Szakértői",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Ideiglenes áramvételezési pont kiépítése",
      "technology": "Kábeles csatlakozás",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Ideiglenes vízvételi pont létesítése",
      "technology": "Csatlakozás hálózatra",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Mobil WC telepítése",
      "technology": "Vegyi WC",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Ideiglenes kerítés építése",
      "technology": "Drótfonat/OSB",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Telek előkészítése, tereprendezés",
      "task": "Kapubejáró kialakítása",
      "technology": "Fém vagy fa szerkezet",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Építési helyszín geodéziai felmérése",
      "technology": "GNSS vagy tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Digitális domborzatmodell készítése",
      "technology": "Szoftveres modellezés",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Helyi alappont hálózat telepítése",
      "technology": "GNSS vagy prizmás mérés",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Telekhatárok kitűzése",
      "technology": "Prizmás mérés",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Épület sarokpontjainak (tengelyeinek) kitűzése",
      "technology": "Tachiméterrel",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Alaptestek tengelyeinek kitűzése",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "±0,00 szintmagasság kitűzése",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Zsaluzás ellenőrző bemérése",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Falsíkok és nyílásközök bemérése",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Oszlopok, pillérek tengelyének bemérése",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Födémszint magassági ellenőrzése",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Tetőszerkezet vonalainak bemérése",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Süllyedés- vagy mozgásvizsgálat",
      "technology": "Geodéziai monitoring",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Gépészeti vezetékek kitűzése",
      "technology": "Tachiméter",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Geodéziai mérési jegyzőkönyv készítése",
      "technology": "Digitális formátumban",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Koordináta-lista (CSV/DWG)",
      "technology": "Digitális export",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Geodéziai kitűzés",
      "task": "Kivitelezői átadási dokumentáció",
      "technology": "PDF / DWG",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapozási vonal kitűzése",
      "technology": "Geodéziai műszeres kitűzés",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapárok nyomvonalának jelölése",
      "technology": "Kézi karózás, festés",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapárok gépi kiemelése",
      "technology": "Kotró-rakodó gép",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapárok kézi kiemelése",
      "technology": "Kézi szerszámokkal",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Gépi földkiemelés szűk helyen",
      "technology": "Mini kotrógép",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Föld szállítása depónia területére",
      "technology": "Gépi",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Föld elszállítása lerakóba",
      "technology": "Billencs teherautó",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapárok fenék szintezése",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapárok oldalainak kézi igazítása",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Vízszintes és függőleges ellenőrzés",
      "technology": "Szintező, műszer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Ásott árok dúcolása pallóval",
      "technology": "Fa dúcolás",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alapozási munkagödör víztelenítése",
      "technology": "Szivattyú",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Talajvízszint ideiglenes süllyesztése",
      "technology": "Szivattyúzás + dréncső",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Alaptestek melletti visszatöltés kézi",
      "technology": "Kézi lapáttal",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Visszatöltés gépi tömörítéssel",
      "technology": "Döngölő vagy vibrolap",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Réteges tömörítés vibrohengerrel",
      "technology": "Gépi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Geodéziai bemérés alapozás után",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozási földmunka",
      "task": "Földkiemelés és visszatöltés naplózása",
      "technology": "Kivitelezői dokumentáció",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Alaptestek helyének kitűzése",
      "technology": "Geodéziai eszközökkel",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Szintek kijelölése (±0,00)",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Sávalap zsaluzása deszkázattal",
      "technology": "Fa zsaluzat",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Sávalap zsaluzása rendszerzsaluzattal",
      "technology": "Fém zsalurendszer",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Sávalap vasalása (hossz- és kengyelvas)",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Sávalap betonozása mixerbetonnal",
      "technology": "C12/15 - C25/30",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Sávalap kézi betonozása",
      "technology": "Kézi keverés, vibrálás",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap alatti sóderágy készítése",
      "technology": "Homokos kavics tömörítve",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap zsaluzása szegéllyel",
      "technology": "Zsaludeszka",
      "unit": "fm",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap alsó vasszerelés",
      "technology": "D12-D16 betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap felső vasszerelés",
      "technology": "D12-D16 betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Távtartók, alátámasztók elhelyezése",
      "technology": "Műanyag és acél",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap betonozása mixerrel",
      "technology": "C20/25 vagy C25/30",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Lemezalap simítása géppel",
      "technology": "Betonhelikopter",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Pontalapok zsaluzása",
      "technology": "Fa vagy fém zsalu",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Pontalapok vasalása",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Pontalapok betonozása",
      "technology": "C20/25",
      "unit": "m³",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Zsalukő alap készítése",
      "technology": "Betonkitöltéssel",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Vízszigetelés alaptestre (kent)",
      "technology": "2 réteg bitumenes",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Vasalási terv alapján vágás, hajlítás",
      "technology": "B500B",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Beton vibrálása kézi tűvibrátorral",
      "technology": "Tűvibrátor",
      "unit": "óra",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Cementfátyol eltávolítása",
      "technology": "Mosás, súrolás",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Alapozás",
      "task": "Geodéziai bemérés betonozás után",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Betonfelület tisztítása, portalanítása",
      "technology": "Kézi vagy gépi",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Felület egyenetlenségeinek kijavítása",
      "technology": "Cementhabarcs",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Alapozó réteg felhordása a betonra",
      "technology": "Bitumenes alapozó",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Bitumenes lemez szigetelés (1 réteg)",
      "technology": "Lángolvasztásos",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Bitumenes lemez szigetelés (2 réteg)",
      "technology": "Lángolvasztásos",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Műanyag lemez szigetelés PVC/PE alapú",
      "technology": "Mechanikai vagy ragasztott",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Szigetelőlemez felhajtása függőleges felületre",
      "technology": "Bitumenes vagy PVC",
      "unit": "fm",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Szigetelés toldása átlapolással, hegesztéssel",
      "technology": "Bitumenes / hőlégfúvós",
      "unit": "fm",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Sarkok, áttörések szigetelése kiegészítő elemekkel",
      "technology": "Speciális szigetelő idom",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Védőréteg elhelyezése geotextíliával",
      "technology": "200-300 g/m²",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Mechanikai védelem kialakítása XPS táblával",
      "technology": "Lépésálló XPS",
      "unit": "m²",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Szigetelés folytonosságának ellenőrzése",
      "technology": "Vizuális és műszeres",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Talajnedvesség elleni szigetelés",
      "task": "Beépítési napló vezetése",
      "technology": "Dokumentáció",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Terepszint mérése, szintezés előtti geodéziai bemérés",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Feltöltés rétegvastagságainak kitűzése",
      "technology": "Geodéziai vagy kézi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Kavics feltöltés (homokos kavics, sóder)",
      "technology": "Kézi vagy gépi terítés",
      "unit": "m³",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Zúzottkő feltöltés 0-63 frakcióban",
      "technology": "Gépi terítés",
      "unit": "m³",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Durva feltöltés bontott kőanyaggal",
      "technology": "Gépi",
      "unit": "m³",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Réteges tömörítés döngölőbékával",
      "technology": "Kézi gép",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Vibrolapos tömörítés 15-30 cm rétegekben",
      "technology": "Gépi",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Vibrohengeres tömörítés",
      "technology": "Gépi, nagyteljesítményű",
      "unit": "m²",
      "laborCost": 1500,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Tömörségi fok ellenőrzése mérőműszerrel",
      "technology": "Proctor-érték alapján",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Aljzatfeltöltés, tömörítés",
      "task": "Rétegrend és mennyiségek rögzítése a naplóban",
      "technology": "Kivitelezői dokumentáció",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Falazási szintek, tengelyek kitűzése",
      "technology": "Geodéziai műszeres",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Első sor pozicionálása, szintezése",
      "technology": "Cementhabarcs ágyazat",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Porotherm 30 N+F falazat építése",
      "technology": "Falazóhabarccsal",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Porotherm 38 K Profi falazat építése",
      "technology": "Ragasztóhabbal",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Ytong 30 cm falazat építése",
      "technology": "Vékonyágyazatú habarcs",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Zsalukő falazat építése 30 cm",
      "technology": "Betonkitöltéssel",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Zsalukő falazat vasalása (hossz- és kengyelvas)",
      "technology": "B500B",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Zsalukő fal betonozása (C16/20)",
      "technology": "Mixerbeton",
      "unit": "m³",
      "laborCost": 5000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Falazatba szerelődoboz, dobozfurat elhelyezése",
      "technology": "Beépítéssel",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Koszorú alatti utolsó sor vízszintezése",
      "technology": "Kézi szintezés",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Teherhordó falszerkezetek építése",
      "task": "Geodéziai bemérés falazás után",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Tengelyek és pozíciók kitűzése",
      "technology": "Geodéziai eszközökkel",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Zsaluzási terv értelmezése, jelölés",
      "technology": "Rajz alapján",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Pillér zsaluzása (fa vagy fém)",
      "technology": "Zsaluépítés",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Gerenda zsaluzása (monolit)",
      "technology": "Állványzat + zsalu",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Pillér vasalás készítése Ø12-20 mm",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Gerenda vasalás készítése Ø12-20 mm",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Kengyelek hajlítása, elhelyezése",
      "technology": "Hajlított acél",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Pillér betonozása C20/25",
      "technology": "Mixer + tűvibrátor",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Gerenda betonozása C20/25",
      "technology": "Mixer + vibrátor",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Betonozás utáni utókezelés (locsolás, takarás)",
      "technology": "Fólia + vízpermet",
      "unit": "m²",
      "laborCost": 5000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Zsaluzat bontása (pillérek, gerendák)",
      "technology": "Kézi",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Pillérek, gerendák betonozása",
      "task": "Geodéziai bemérés kivitelezés után",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Födémkontúr és szintek kitűzése",
      "technology": "Geodéziai műszeres",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Födémszintek bemérése",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Monolit födém zsaluzása (fa)",
      "technology": "Hagyományos fa zsaluzat",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Monolit födém zsaluzása (rendszer)",
      "technology": "Fém zsaluhéj rendszer",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Alátámasztás, dúcolás",
      "technology": "Fa vagy acél állvány",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Monolit födém vasalása (alsó/felső)",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Hegesztett síkháló elhelyezése",
      "technology": "Q131 / Q188",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Monolit födém betonozása",
      "technology": "C20/25 mixer + vibrátor",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Felület simítása (kézi/gépi)",
      "technology": "Betonhelikopter / simító",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Utókezelés (locsolás, takarás)",
      "technology": "Fóliás takarás",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Zsalubontás, dúcolat eltávolítása",
      "technology": "Kézi bontás",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Födémgerendák elhelyezése",
      "technology": "Porotherm előregyártott",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Béléstestek behelyezése",
      "technology": "Kerámia vagy beton",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Monolit vasalás elhelyezése (koszorú, monolit rész)",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Födém monolit részének betonozása",
      "technology": "C20/25",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Födémszint utólagos szintezése",
      "technology": "Kézi eszközök",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Előregyártott födémelemek beemelése",
      "technology": "Darus beemelés",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Egyes elemek közötti monolit kitöltés",
      "technology": "C20/25 kézi/mixer",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Toldások, vasalások elhelyezése",
      "technology": "Acélbetét, távtartók",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Elemek vízszintellenőrzése",
      "technology": "Szintezőlézer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Födémszerkezet elkészítése",
      "task": "Geodéziai ellenőrző bemérés",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Koszorú tengelyeinek kitűzése",
      "technology": "Geodéziai műszeres",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Zsaluzási szintek meghatározása",
      "technology": "Szintezőműszer",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Koszorú zsaluzása fa anyagból",
      "technology": "Deszka, léc, OSB",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Koszorú zsaluzása zsalu rendszerrel",
      "technology": "Fém zsaluhéj",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Koszorú zsaluzat rögzítése, alátámasztása",
      "technology": "Fa vagy fém támasz",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Hosszvasak elhelyezése (Ø12-16 mm)",
      "technology": "B500B betonacél",
      "unit": "kg",
      "laborCost": 450,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Kengyelek hajlítása, beépítése",
      "technology": "Ø6-8 mm betonacél",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Távtartók és védőréteg biztosítása",
      "technology": "Műanyag távtartó",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Koszorú betonozása C20/25",
      "technology": "Mixer vagy kézi",
      "unit": "m³",
      "laborCost": 16000,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Beton tömörítése tűvibrátorral",
      "technology": "Vibrálás",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Felület simítása",
      "technology": "Kézi glettvas",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Beton utókezelés (locsolás, takarás)",
      "technology": "Fólia + víz",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Zsaluzat bontása",
      "technology": "Kézi",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Koszorúk készítése",
      "task": "Geodéziai ellenőrzés kivitelezés után",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Tetőgeometria kitűzése, szintezése",
      "technology": "Geodéziai műszeres",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Statikai terv és faanyag egyeztetése",
      "technology": "Tervdokumentáció alapján",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Faanyag méretre vágása",
      "technology": "Gép vagy kézi",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Faanyag gomba- és tűzvédelme",
      "technology": "Felületkezelés, bemártás",
      "unit": "m²",
      "laborCost": 5000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Fő tetőgerendák elhelyezése",
      "technology": "Fűrészelt gerenda",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Szarufák beépítése",
      "technology": "Fűrészelt gerenda",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Ellenlécek, fogópárok szerelése",
      "technology": "Lécezés, csavarozás",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Taréjgerenda, élgerenda, vápa beépítése",
      "technology": "Csapolt vagy csavarozott",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Torziós merevítések, keresztirányú kötés",
      "technology": "Merevítő pántolás",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Acél kapcsolók, kengyelek felszerelése",
      "technology": "Horganyzott acél",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Csavarozás, kötőelemek elhelyezése",
      "technology": "Rozsdamentes, facsavar",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Geodéziai ellenőrzés (tengely, lejtés)",
      "technology": "Tachiméter",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőszerkezet ácsmunkái",
      "task": "Faanyag beépítési napló készítése",
      "technology": "Dokumentáció",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Fedési terv ellenőrzése, típus meghatározás",
      "technology": "Tervdokumentáció alapján",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Tetőszerkezet vízszint- és lejtésellenőrzése",
      "technology": "Geodéziai / kézi szintezés",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Párazáró fólia fektetése",
      "technology": "Diffúz fólia, átlapolással",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Ellenlécek elhelyezése",
      "technology": "Impregnált fa, szegelés",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Tetőléc rögzítése fedési osztás szerint",
      "technology": "Faanyag, szegelés",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Betoncserép fedés elhelyezése",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Kerámiacserép fedés elhelyezése",
      "technology": "Kézi",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Cseréptető szellőzőcserepek, szegélyek beépítése",
      "technology": "Gyári kiegészítők",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Trapézlemez vagy síklemez fedés elhelyezése",
      "technology": "Csavarozott vagy rejtett rögzítés",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Lemezfedés szegélyezése (vápalemez, élgerinc)",
      "technology": "Hajtott bádogelemek",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Bitumenes zsindely fedés",
      "technology": "Ragasztás és szegezés",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Zsindelyalátét lemez fektetése",
      "technology": "Bitumenes lemez",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Zsindely gerinc- és szegélyelemek elhelyezése",
      "technology": "Gyári elemek",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Tetőkibúvók, kéményszegélyek beépítése",
      "technology": "Gyári szett + tömítés",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Hófogók felszerelése",
      "technology": "Horganyzott vagy festett acél",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Záróelemek, élgerincek beépítése",
      "technology": "Cserép vagy lemez",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Tetőfedés",
      "task": "Beépítési napló készítése",
      "technology": "Dokumentáció",
      "unit": "db",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Tető éleinek felmérése, hossz bemérése",
      "technology": "Helyszíni felmérés",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Csatorna- és lefolyórendszer méretezése",
      "technology": "Terv és szabvány alapján",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Fém ereszcsatorna felszerelése (horganyzott)",
      "technology": "Kampók, toldók",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Fém ereszcsatorna felszerelése (színes alumínium)",
      "technology": "Rendszerelemekkel",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Műanyag ereszcsatorna szerelése",
      "technology": "Gyári idomokkal",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Lefolyócső felszerelése horganyzott acélból",
      "technology": "Falra rögzített",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Lefolyócső szerelése színes alumíniumból",
      "technology": "Szegletek, könyökök",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Szűkítő- és összefolyó elemek beépítése",
      "technology": "Kézi illesztés",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Tetőperem bádogozása (szegélylemez)",
      "technology": "Hajtott bádog",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Vápabádogozás beépítése",
      "technology": "Kettős hajtással",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Élgerinc és falszegélyek elhelyezése",
      "technology": "Profilozott bádog",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Kéményszegélyek kialakítása",
      "technology": "Speciális lemezidom",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Szellőző-, tetőkibúvó körüli bádogozás",
      "technology": "Kézzel hajtott",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Tágulási hézag bádog takarása",
      "technology": "Csúszóillesztés",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Vízpróba, szivárgásellenőrzés",
      "technology": "Vízzel vagy esőztetővel",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Bádogos munkák",
      "task": "Bádogos munkák dokumentálása, fotózás",
      "technology": "Digitális átadás",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Falnyílások ellenőrzése, méretfelvétel",
      "technology": "Lézeres vagy kézi mérés",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Beépítési sík és magasság jelölése",
      "technology": "Geodéziai vagy kézi",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Ablak beemelése és rögzítése",
      "technology": "Téglakeretes, tokszeges",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Bejárati ajtó beemelése és rögzítése",
      "technology": "Acél vagy műanyag",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Erkélyajtó beépítése",
      "technology": "3 rétegű üveg, tokcsavarozás",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Nyílászárók vízszint- és függőleges állítása",
      "technology": "Ékpárna, távtartó",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Rögzítési pontok kialakítása",
      "technology": "Tokcsavar, dűbel",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "PU habbal hézagkitöltés",
      "technology": "Alacsony tágulású",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Páraszabályzó fólia beépítése",
      "technology": "Belülre és kívülre",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Ablakpárkány előkészítés / fogadás kialakítása",
      "technology": "Habarcstömítés, síkolás",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Vízvető bádoglemez beépítése",
      "technology": "Hajtott vagy gyári",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Tokba integrált redőnytok előkészítése",
      "technology": "Tok elhelyezés és rögzítés",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Külső nyílászárók beépítése",
      "task": "Beépítési jegyzőkönyv és fotódokumentáció",
      "technology": "Digitális átadás",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Nyílászárók felmérése árnyékoláshoz",
      "technology": "Méret, beépítési mélység",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Redőnytok és lefutók felszerelése",
      "technology": "Alumínium vagy műanyag",
      "unit": "fm",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Kézi vagy motoros redőny beépítése",
      "technology": "Tokba szerelve",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Zsaluzia felszerelése",
      "technology": "Motoros vezérléssel",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Napellenző (karám vagy könyökkaros) felszerelése",
      "technology": "Falra vagy mennyezetre",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Reluxa felszerelése",
      "technology": "Fa, alu, műanyag",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Roló, sötétítő vagy blackout függöny felszerelése",
      "technology": "Sínnel vagy rúdra",
      "unit": "fm",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Pliszé vagy harmonikaroló telepítése",
      "technology": "Egyedi méretre",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Motoros árnyékolók bekötése, tesztelése",
      "technology": "Kapcsolós vagy távirányítós",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Időzített vagy szenzoros vezérlés programozása",
      "technology": "Okosotthon rendszerrel integrálva",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Árnyékolástechnika",
      "task": "Használati és karbantartási útmutató átadása",
      "technology": "Digitális vagy nyomtatott",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Helyszíni mérés, kiállások pozícióinak kijelölése",
      "technology": "Terv alapján",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Gépészeti nyomvonalak felrajzolása",
      "technology": "Falon/padlón jelölés",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Hideg-meleg víz alapvezeték kiépítése",
      "technology": "KPE vagy MÜA cső",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Elosztó helyek előkészítése",
      "technology": "Szerelőléc, csőidom",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Átvezetések falban, padlóban",
      "technology": "Kézi fúrás, vésés",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Szennyvíz lefolyócsövek elhelyezése",
      "technology": "PVC KG cső",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Lejtés ellenőrzése szintezőlézerrel",
      "technology": "Műszeres",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Padlóösszefolyók, WC csatlakozás kiépítése",
      "technology": "Műanyag idomok",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Kábeltálcák, védőcsövek fektetése",
      "technology": "MÜA cső, szerelődoboz",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Vezetékek alapcsövezése padlóban",
      "technology": "MT kábel / védőcső",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Földelés kiépítése (alaptestbe)",
      "technology": "Réz vezető szalag",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Próbatöltés és nyomáspróba (víz)",
      "technology": "Nyomásmérő órával",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Folyáspróba (csatorna)",
      "technology": "Vízöntéses ellenőrzés",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Villamos bekötések ellenőrzése",
      "technology": "Műszeres mérés",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Víz-, csatorna-, villany alapszerelés",
      "task": "Dokumentáció készítése, fotózás",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 7000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Helyszín felmérése, válaszfalak kitűzése",
      "technology": "Geodéziai vagy kézi",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Csomópontok, válaszfalvégződések jelölése",
      "technology": "Terv alapján",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "10 cm-es válaszfaltégla falazása",
      "technology": "Falazóhabarccsal",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "12 cm-es Ytong válaszfal falazása",
      "technology": "Vékonyágyazattal",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Tégla válaszfal zárása födémszerkezethez",
      "technology": "Vasalt koszorú vagy PU hab",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Gipszkarton vázszerkezet építése CW/UW profilból",
      "technology": "Fémprofil szerelés",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Gipszkarton burkolat szerelése 1 réteg",
      "technology": "12,5 mm lap",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Gipszkarton burkolat szerelése 2 réteg",
      "technology": "2x12,5 mm lap",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Szigetelő gyapot behelyezése a váz közé",
      "technology": "Ásványgyapot",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Zsalukő válaszfal építése",
      "technology": "Betonnal kiöntve",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Fa vázszerkezetes válaszfal borítással",
      "technology": "OSB vagy gipszrost",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Válaszfalba szerelvénydoboz, elektromos doboz elhelyezése",
      "technology": "Doboz + vágás",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Utólagos hangszigetelés beépítése",
      "technology": "Ragasztott panel vagy szigetelőlap",
      "unit": "m²",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Válaszfalak dilatálása, csatlakozási hézag zárása",
      "technology": "Rugalmas kitöltés",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső válaszfalak építése",
      "task": "Falazási terv és fotódokumentáció",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Felület előkészítése (portalanítás, nedvesítés)",
      "technology": "Kézi, vízzel",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Vakolatháló elhelyezése saroknál, csatlakozásnál",
      "technology": "Műanyag, fém élvédő",
      "unit": "fm",
      "laborCost": 2000,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Belső fal kézi vakolása cementes vagy meszes vakolattal",
      "technology": "Hagyományos 2 réteg",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Belső mennyezet kézi vakolása",
      "technology": "Simított felület",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Gépi belső vakolás (1 réteg)",
      "technology": "Gépi vakológéppel",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Gépi belső vakolás (2 réteg)",
      "technology": "Cement-mész alapú",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Homlokzati felület kézi vakolása",
      "technology": "Cementes vagy mész-cementes",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Párkányok, nyíláskeretek kézi vakolása",
      "technology": "Finomvakolat",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Homlokzati gépi vakolás",
      "technology": "Gépi felhordás + simítás",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Gépi szórt díszvakolat felhordása",
      "technology": "Színezett vagy fehér",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Vakolat javítása repedésnél, élnél",
      "technology": "Gyorsjavító vakolat",
      "unit": "fm",
      "laborCost": 2000,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Felületek glettelése vakolás után",
      "technology": "1-2 mm réteg",
      "unit": "m²",
      "laborCost": 3800,
      "materialCost": 0
    },
    {
      "category": "Vakolás (külső és belső)",
      "task": "Felületminőség ellenőrzése, dokumentálása",
      "technology": "Digitális vagy kézi",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Fal előkészítése, portalanítás, alapozás",
      "technology": "Alapozó + tisztítás",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Indítósín felszerelése lábazatnál",
      "technology": "Alumínium profil",
      "unit": "fm",
      "laborCost": 2200,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "EPS lapok ragasztása (10-15 cm)",
      "technology": "Polisztirol, sík felületre",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Grafit EPS lapok ragasztása",
      "technology": "Javított hőszigetelés",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Kőzetgyapot lapok ragasztása",
      "technology": "Ásványi anyag, tűzálló",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Hőszigetelés dűbelezése",
      "technology": "Tányéros dűbel",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Üvegszövet háló beágyazása",
      "technology": "Alapvakolattal",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Sarkok, élek élvédőzése",
      "technology": "PVC élvédő",
      "unit": "fm",
      "laborCost": 2200,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Átvonó- és simítóréteg felhordása",
      "technology": "Cementes/gyantas kötésű",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Díszvakolat felhordása (kapart/rolnizott)",
      "technology": "Színezett, szilikonos",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Homlokzati festés/védelem",
      "technology": "Vízlepergető vakolatfesték",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Dekorburkolat (tégla, kőlap) elhelyezése",
      "technology": "Sávos vagy teljes burkolás",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Hőszigetelés és homlokzatképzés",
      "task": "Beépítési fotódokumentáció",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Fogadófelület tisztítása, alapozás",
      "technology": "Tapadóhíd + portalanítás",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Peremszigetelés (dilatációs szalag) elhelyezése",
      "technology": "Habcsík",
      "unit": "fm",
      "laborCost": 2000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Kézi esztrich réteg készítése",
      "technology": "Cementes, lejtésképzéssel",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Tömörítés és lehúzás kézi eszközzel",
      "technology": "Léccel, simítóval",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Gépi esztrich készítése keverőszivattyúval",
      "technology": "Estrich betonszivattyú",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Esztrich szintezése lézerrel",
      "technology": "Lézeres beállítás",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Beton simítása géppel",
      "technology": "Betonhelikopter",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Önterülő esztrich kiöntése",
      "technology": "Padlókiegyenlítő",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Tüskéshengeres buborékmentesítés",
      "technology": "Kézi szerszámmal",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Vasalás hálóval (ha szükséges)",
      "technology": "Hegesztett acélháló",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Védőfólia elhelyezése hőszigetelésre",
      "technology": "PE fólia",
      "unit": "m²",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Esztrich betonozás (aljzatbeton)",
      "task": "Szintezési jegyzőkönyv, fotó",
      "technology": "Digitális dokumentáció",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Mosdó, kézmosó csaptelep felszerelése",
      "technology": "Egykaros, flexibilis bekötés",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Mosogató csaptelep és szifon szerelése",
      "technology": "Alsó szekrénybe",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Zuhany- vagy kádcsap felszerelése",
      "technology": "Falba süllyesztett vagy fali",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "WC csésze és tartály rögzítése",
      "technology": "Monoblokkos vagy rejtett",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "WC bekötése",
      "technology": "Monoblokkos vagy rejtett",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Kád bekötése",
      "technology": "Monoblokkos vagy rejtett",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Bidé csatlakoztatása",
      "technology": "Kifolyó és lefolyó bekötés",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Radiátorok felszerelése",
      "technology": "Lemezes, szelep beállítás",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Konvektor bekötése",
      "technology": "Gázelzáró + csőcsatlakozás",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Padlófűtés osztó-gyűjtő egység szerelése",
      "technology": "Kompakt egység",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Csőhálózat csatlakoztatása radiátorhoz",
      "technology": "Pex vagy réz",
      "unit": "fm",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Kondenzációs kazán felszerelése",
      "technology": "Fali, zárt égésterű",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Gázcsatlakozó szerelése, szivárgáspróba",
      "technology": "Műszeres",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Tágulási tartály, biztonsági szelep szerelése",
      "technology": "Zárt rendszerhez",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Nyomáspróba, szivárgásvizsgálat",
      "technology": "Gépész műszerekkel",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Fűtési rendszer feltöltése, légtelenítés",
      "technology": "Keringető szivattyúval",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Gépészet szerelvényezése",
      "task": "Beüzemelési jegyzőkönyv, dokumentáció",
      "technology": "Digitális átadás",
      "unit": "db",
      "laborCost": 8500,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Légtechnikai nyomvonalak kijelölése",
      "technology": "Terv alapján, födém vagy álmennyezet",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Furatok, áttörések készítése falon/födémen",
      "technology": "Gyémántfúróval, vágással",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Kör keresztmetszetű légcsatorna szerelése",
      "technology": "Horganyzott acél, klipszes",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Lapos (ovális) légcsatorna szerelése",
      "technology": "Műanyag vagy alu",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Szigetelt légcsatorna szerelése",
      "technology": "Pára- és hőszigetelt",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Légtechnikai idomok és csatlakozók beépítése",
      "technology": "Könyök, T-idom, szűkítés",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Szabályozó szelepek, zsaluk felszerelése",
      "technology": "Manuális vagy motoros",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Hővisszanyerős szellőztető egység beépítése",
      "technology": "Lakossági, 250–400 m³/h",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Ventilátor vagy elszívó egység beépítése",
      "technology": "WC, fürdő, konyha",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Kondenzvíz elvezetés és elektromos bekötés",
      "technology": "Szintkiegyenlítéssel",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Légtechnikai hálózat tesztelése, beszabályozás",
      "technology": "Műszeres légmennyiség-mérés",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Légtechnika",
      "task": "Dokumentáció, garanciajegyek, beüzemelési jegyzőkönyv",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Kiállások ellenőrzése és előkészítése",
      "technology": "Dobozig, kábelvég előkészítés",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Egypólusú kapcsoló beépítése",
      "technology": "Süllyesztett, sorolható",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Kétpólusú kapcsoló beépítése",
      "technology": "Fürdő vagy konyhai",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Dugalj (konnektor) felszerelése",
      "technology": "Süllyesztett, kerettel",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "USB-s dugalj vagy töltőmodul beépítése",
      "technology": "Soros kivitel",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Mennyezeti lámpa felszerelése",
      "technology": "Klasszikus vagy LED",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Fali lámpa, tükörvilágítás beépítése",
      "technology": "Fürdő, háló",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "LED spot vagy sínrendszer bekötése",
      "technology": "Feszültségszabályzóval",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Kapcsolók és dugaljak sorolása, keretezése",
      "technology": "Többsoros kivitel",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Vezetékek ellenőrzése, érintésvédelem mérése",
      "technology": "Műszeres",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Villanyszerelés szerelvényezése",
      "task": "Áramkör beazonosítása és dokumentálása",
      "technology": "Digitális átadás",
      "unit": "db",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Helyszíni biztonságtechnikai felmérés",
      "technology": "Lakás, ház, telek",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Rendszerterv és nyomvonal kijelölése",
      "technology": "Digitális, alaprajz alapján",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Mozgásérzékelők felszerelése",
      "technology": "Infravörös, 90° vagy 360°",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Nyitásérzékelők felszerelése (ablak/ajtó)",
      "technology": "Mágneses érzékelő",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Riasztó központi egység és kezelőpanel bekötése",
      "technology": "Vezetékes vagy vezeték nélküli",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Beltéri és kültéri sziréna felszerelése",
      "technology": "Akkumulátorral",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "IP vagy analóg kamera felszerelése",
      "technology": "Fix vagy PTZ",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Kamerák hálózati bekötése és tesztelése",
      "technology": "POE vagy külön tápos",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "DVR vagy NVR rögzítő telepítése",
      "technology": "4-8-16 csatornás",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Képfelvétel távoli elérésének beállítása",
      "technology": "Mobil app, internet",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Kapunyitó rendszer kiépítése",
      "technology": "Kódos vagy RFID rendszer",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Videó kaputelefon felszerelése",
      "technology": "Képernyős beltéri egységgel",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Ajtónyitó mágneszár beszerelése",
      "technology": "Kapcsolóval vagy kaputelefonnal vezérelve",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Biztonságtechnika",
      "task": "Garanciális átadás, telepítési jegyzőkönyv",
      "technology": "Digitális formában",
      "unit": "db",
      "laborCost": 18000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okosotthon rendszer igényfelmérése és tervezés",
      "technology": "Funkciólista, alaprajzhoz igazítva",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Kábeltálcák, védőcsövek kiépítése",
      "technology": "Falon belüli vagy felületszerelt",
      "unit": "fm",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Központi vezérlőegység telepítése",
      "technology": "LAN/Wi-Fi, Zigbee, Z-Wave",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okos otthoni router, switch beállítása",
      "technology": "Vezetékes hálózat, redundancia",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okoskapcsolók, dimmer telepítése",
      "technology": "Wi-Fi, Zigbee, falba süllyesztett",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "RGBW LED szalagok és vezérlő beépítése",
      "technology": "Rejtett világítással",
      "unit": "m²",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Motoros redőnyök okos vezérlésének kiépítése",
      "technology": "Időzített, szenzoros",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okostermosztát telepítése és integrálása",
      "technology": "Zónafűtés, távvezérlés",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Kazán, hűtés, szellőzés okosvezérlésének kiépítése",
      "technology": "Relés vagy digitális kommunikációval",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okos riasztó és kamera integráció",
      "technology": "Mozgás, távriasztás, applikáció",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Okos zár, kapunyitás távoli vezérléssel",
      "technology": "Bluetooth/NFC/Wi-Fi",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Hőmérséklet, páratartalom, CO2 szenzorok elhelyezése",
      "technology": "Zigbee vagy Z-Wave",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Ajtó/ablak nyitásérzékelők okos integrációja",
      "technology": "Elemes, mágneses",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Vízszivárgás és füstérzékelők telepítése",
      "technology": "Helyiségszinten",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Rendszer programozása, jelenetek beállítása",
      "technology": "Mobil applikációval",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Okosotthon",
      "task": "Használati oktatás, átadás dokumentációval",
      "technology": "Felhasználónak",
      "unit": "db",
      "laborCost": 22000,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Aljzat ellenőrzése, szintezés, alapozás",
      "technology": "Padlóra, falra",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Fali csempeburkolat készítése (20x20 – 30x60 cm)",
      "technology": "Kézi ragasztás, fugázás",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Fali csempeburkolat készítése (60x60 cm felett)",
      "technology": "Megfogóval, síkrendszerrel",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Dekorcsempe, díszcsík, mozaik elhelyezése",
      "technology": "Finom kézi illesztés",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Padlólap ragasztása (30x30 – 45x45 cm)",
      "technology": "Kézi szintezéssel",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Padlólap ragasztása (60x60 cm felett)",
      "technology": "Szintező rendszerrel",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Fugázás, sarokszegély kialakítás",
      "technology": "Szilikon + fuga",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Laminált padló fektetése klikkes rendszerrel",
      "technology": "Habarcs nélkül",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Alátétfólia, párazáró réteg leterítése",
      "technology": "PE fólia + alátét",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Szegélyléc felhelyezése (laminált padlóhoz)",
      "technology": "Ragasztott vagy pattintott",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Tömörfa parketta fektetése",
      "technology": "Ragasztott, illesztett",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Parketta csiszolása és lakkozása",
      "technology": "3 réteg lakkréteg",
      "unit": "m²",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső burkolatok",
      "task": "Burkolási terv és kivitelezési jegyzőkönyv",
      "technology": "Digitális átadás",
      "unit": "db",
      "laborCost": 3000,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Felületek portalanítása, glettelés",
      "technology": "1-2 réteg",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Csiszolás, felületkiegyenlítés",
      "technology": "Gépi vagy kézi",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Takarás, maszkolás ajtók, nyílászárók mentén",
      "technology": "Fólia, szalag",
      "unit": "fm",
      "laborCost": 1800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Belső falak festése diszperziós festékkel",
      "technology": "2 réteg, hengerrel",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Belső falak festése színes festékkel",
      "technology": "2 réteg, javítással",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Mennyezet festése",
      "technology": "Fehér diszperziós festék",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Dekorfestés vagy struktúrált festék felvitele",
      "technology": "Kapart, hengerezett, mintás",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Tapétázás, poszter elhelyezése",
      "technology": "Kézi illesztés, ragasztás",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Beltéri ajtók mázolása",
      "technology": "Oldószeres zománc",
      "unit": "db",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Ablakkeretek mázolása",
      "technology": "Két oldalon, ecsettel",
      "unit": "db",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Radiátor festése",
      "technology": "Hőálló zománc",
      "unit": "db",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Festés utáni takarítás, elszállítás",
      "technology": "Takaróanyagok + sitt",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Festés, mázolás",
      "task": "Festési napló, színkód dokumentáció",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 5500,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Ajtónyílás méretének ellenőrzése, szintezése",
      "technology": "Lézeres szintmérés",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Tok behelyezése és rögzítése purhabbal",
      "technology": "Fém vagy fa tok",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Ajtószárny felszerelése a tokra",
      "technology": "Fa, CPL vagy üvegajtó",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Zár, kilincs, pántok felszerelése",
      "technology": "Alap vasalattal",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Ajtólap beállítása, finombeállítás",
      "technology": "Vízszint, csukódás",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Párkány, takaróléc felszerelése",
      "technology": "Fa, MDF vagy fóliázott",
      "unit": "fm",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Belső ajtók beépítése",
      "task": "Beépítési jegyzőkönyv, dokumentáció",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 9000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Térszervezési koncepció kialakítása",
      "technology": "3D látványterv, alaprajz",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Belsőépítészeti burkolatok (dekorpanel, falburkolat)",
      "technology": "Fa, MDF, kompozit panelek",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Álmennyezet kiépítése rejtett világítással",
      "technology": "Gipszkarton + LED sín",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Design gardróbszekrény vagy tároló beépítése",
      "technology": "Egyedi, méretre szabott",
      "unit": "fm",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Multifunkciós bútorok telepítése (pl. ágy+íróasztal)",
      "technology": "Modul rendszer",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Falikép, dekorációs világítás felszerelése",
      "technology": "Csavaros vagy mágneses rögzítés",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Tükör, üvegfal vagy belső tolóajtó elhelyezése",
      "technology": "Egyedi gyártás, fali rögzítéssel",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Hangszigetelő burkolatok elhelyezése",
      "technology": "Akusztikai panel vagy hab",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Vetítővászon, multimédia beépítése",
      "technology": "Falba vagy mennyezetbe",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Függönyrúd felszerelése, függöny felhelyezése",
      "technology": "Karnis és dekor anyag",
      "unit": "fm",
      "laborCost": 6500,
      "materialCost": 0
    },
    {
      "category": "Belsőépítészet",
      "task": "Belsőépítészeti látványtervek, műleírás átadása",
      "technology": "Digitális PDF, DWG",
      "unit": "db",
      "laborCost": 20000,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Helyszín felmérése és bútorpozíciók jelölése",
      "technology": "Terv alapján",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Alsó szekrényelemek összeállítása és szintezése",
      "technology": "Lábazat és vízszintezés",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Felső szekrényelemek rögzítése fali tartóra",
      "technology": "Csavarozással",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Munkapult elhelyezése és rögzítése",
      "technology": "Laminált, fa, kompozit",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Mosogató és csaptelep beépítése",
      "technology": "Kivágás, rögzítés, bekötés",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Beépíthető készülékek rögzítése (főzőlap, sütő)",
      "technology": "Elektromos/gáz csatlakozás nélkül",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Beépített gardróbszekrény összeállítása",
      "technology": "Tolóajtós vagy nyílóajtós",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Fürdőszobai szekrény, pult elhelyezése",
      "technology": "Fali rögzítés, vízálló",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Ajtók, fiókok beállítása",
      "technology": "Zsanér, sín beállítás",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Szegélylécek, záróelemek felszerelése",
      "technology": "Klipszes vagy ragasztott",
      "unit": "fm",
      "laborCost": 7500,
      "materialCost": 0
    },
    {
      "category": "Konyhabútor, egyéb beépített bútorok",
      "task": "Beépítési dokumentáció, átadás",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 9500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Udvar szintezése, tereprendezés",
      "technology": "Földmunkagép vagy kézi",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Termőföld elterítése füvesítéshez",
      "technology": "5-15 cm vastagságban",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Füvesítés vetéssel vagy gyepszőnyeggel",
      "technology": "Gépi vető vagy gyeptéglázás",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Járdaalap készítése zúzottkőből",
      "technology": "Tömörítéssel",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Térkő burkolat lerakása",
      "technology": "6-8 cm vastagságú",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Járdaszegély beépítése",
      "technology": "Betonágyba",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Kocsibeálló alapozása",
      "technology": "Tükör, kavics, tömörítés",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Nehézgépjárműre alkalmas térkő burkolás",
      "technology": "Vastagított, ipari",
      "unit": "m²",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Kerítésalap kiásása és betonozása",
      "technology": "30-40 cm mély",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Kerítésoszlop beállítása, betonozása",
      "technology": "Vas vagy fa",
      "unit": "db",
      "laborCost": 12000,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Kerítéselemek rögzítése",
      "technology": "Fém, fa, beton",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Gyalogos vagy kocsibejáró kapu felszerelése",
      "technology": "Helyszíni beállítással",
      "unit": "db",
      "laborCost": 12000,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Szivárgó, vízelvezető árkok építése",
      "technology": "PVC vagy zúzottkő",
      "unit": "fm",
      "laborCost": 3500,
      "materialCost": 0
    },
    {
      "category": "Külső tereprendezés, kerítés, burkolatok",
      "task": "Tereprendezési és kertépítési terv átadása",
      "technology": "Digitális",
      "unit": "db",
      "laborCost": 12000,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Talajrendezés, terepszintezés",
      "technology": "Földmunkagép vagy kézi",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Gyommentesítés, talajlazítás",
      "technology": "Rotálás, kézi ásás",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Termőföld terítése",
      "technology": "5–15 cm réteg, finom terítés",
      "unit": "m³",
      "laborCost": 4500,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Fűmagvetés",
      "technology": "Gépi vagy kézi, hengerezéssel",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Gyepszőnyeg fektetése",
      "technology": "Tömörítéssel, öntözéssel",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Fák, cserjék ültetése",
      "technology": "Konténeres vagy földlabdás",
      "unit": "db",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Évelők, talajtakarók telepítése",
      "technology": "Ágyásszegély mentén",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Kerti szegély lerakása",
      "technology": "Műanyag, beton vagy fém",
      "unit": "fm",
      "laborCost": 2500,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Kerti utak, díszburkolatok kialakítása",
      "technology": "Kavics, fa, térkő",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Tó, sziklakertek, dekorációs elemek elhelyezése",
      "technology": "Kavics, díszkő, fólia",
      "unit": "db",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Automata öntözőrendszer kiépítése",
      "technology": "Elektromos vezérlés + csepegtető",
      "unit": "m²",
      "laborCost": 2800,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Kerti világítás kiépítése",
      "technology": "Földkábeles vagy napelemes",
      "unit": "db",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Kertépítés",
      "task": "Kertépítési terv, beültetési terv átadása",
      "technology": "Digitális, pdf",
      "unit": "db",
      "laborCost": 6000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Földmedence kiemelése, alapozás",
      "technology": "Gépi földmunka + kavicságy",
      "unit": "m³",
      "laborCost": 8000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Zsaluköves vagy műanyag medencetest építése",
      "technology": "Helyszíni vagy előregyártott",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Medence vízszigetelés, fóliázás",
      "technology": "PVC vagy EPDM",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Medencegépészet (szűrő, szivattyú, csövezés)",
      "technology": "Homokszűrős rendszer",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Medenceburkolat elhelyezése",
      "technology": "Mozaik, kő vagy műkő",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Jacuzzi beemelése és helyszíni beállítása",
      "technology": "Daruzás vagy kézi",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Jacuzzi elektromos és víz bekötése",
      "technology": "Kül- és beltéri",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Burkolat vagy takarás kialakítása jacuzzihoz",
      "technology": "Fa, kompozit vagy műkő",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Dézsa telepítése és vízcsatlakozás kiépítése",
      "technology": "Fatüzeléses vagy elektromos",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Dézsa burkolása, aljzat előkészítése",
      "technology": "Fakocka, térkő, beton",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Szaunakabin összeszerelése (beltéri)",
      "technology": "Finn, infra vagy kombi",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Szaunavezérlés, szaunakályha bekötése",
      "technology": "Elektromos, védett áramkör",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Hőszigetelés és pára elleni védelem kialakítása",
      "technology": "Alufólia + ásványgyapot",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Gőzkabin beállítása, gépészet csatlakozás",
      "technology": "Beépített gőzgenerátorral",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Burkolat gőztérben (csempe/mozaik)",
      "technology": "Hőálló ragasztóval",
      "unit": "m²",
      "laborCost": 10000,
      "materialCost": 0
    },
    {
      "category": "Wellness létesítmények",
      "task": "Beüzemelési dokumentáció, garancia jegyzőkönyv",
      "technology": "Digitális vagy nyomtatott",
      "unit": "db",
      "laborCost": 60000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Használatbavételi engedélyhez szükséges dokumentumok összeállítása",
      "technology": "Műszaki dokumentáció, tervlapok",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Gépészeti rendszerek ellenőrzése, próbaüzem dokumentálása",
      "technology": "Fűtés, víz, elektromos",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Építési napló zárása, kivitelezői nyilatkozatok átadása",
      "technology": "Elektronikus rendszerben",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Tűzvédelmi, energetikai, statikai igazolások biztosítása",
      "technology": "Szakági dokumentumok",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Használati útmutatók, kezelési dokumentumok átadása",
      "technology": "Gépészet, beépített berendezések",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Építtetővel közös bejárás, hibajegyzék felvétele",
      "technology": "Jegyzőkönyvezve",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Hatósági bejárás koordinálása (jegyző, tűzoltóság, kormányhivatal)",
      "technology": "Ütemezés, jelenlét",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Műszaki átadás",
      "task": "Átadás-átvételi jegyzőkönyv kitöltése, aláírások",
      "technology": "Záró dokumentáció",
      "unit": "db",
      "laborCost": 15000,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Végső belső takarítás (por, ragasztó, nyomok)",
      "technology": "Padozat, burkolatok, nyílászárók",
      "unit": "m²",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Ablakok, ajtók teljes körű tisztítása",
      "technology": "Üvegfelületek, keretek",
      "unit": "m²",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Saniterek, konyhai felületek fertőtlenítő tisztítása",
      "technology": "Mosdók, WC, munkapult",
      "unit": "db",
      "laborCost": 4000,
      "materialCost": 0
    },

    {
      "category": "Kulcsrakész átadás",
      "task": "Külső burkolatok, járdák tisztítása",
      "technology": "Söprés, mosás",
      "unit": "m²",
      "laborCost": 1200,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Kulcsok, távirányítók, kezelőeszközök átadása",
      "technology": "Címkézett csomagolással",
      "unit": "db",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Felhasználói kézikönyv, használati utasítások átadása",
      "technology": "Fűtés, szellőzés, gépészet",
      "unit": "db",
      "laborCost": 4000,
      "materialCost": 0
    },
    {
      "category": "Kulcsrakész átadás",
      "task": "Építtetővel bejárás, végső jegyzőkönyv",
      "technology": "Digitális aláírással",
      "unit": "db",
      "laborCost": 4000,
      "materialCost": 0
    }
  ]
  
 When a user provides a request, always match it with the most relevant tasks from this catalog.

When returning the generated offer text, format each line item like this:

*Tétel neve: [quantity] [unit] × [unit price] Ft/[unit] = [total] Ft

For example:
*Burkolás: 12 m² × 8 000 Ft/m² = 96 000 Ft

- Always start the line with an asterisk (*) and a space.
- Use a colon (:) after the item name.
- Use × (multiplication sign) between quantity and unit price.
- Use "Ft/[unit]" as unit label.
- End the line with "= [amount] Ft".

Example:
*Vakolás: 15 m² × 4 500 Ft/m² = 67 500 Ft

This format is essential for automated parsing and table rendering. Please ensure every item in the offer follows this pattern.

Propose tasks with clear descriptions, labor cost, material cost, and unit of measurement.


Always calculate the total estimated cost by summing up labor and material costs, multiplied by the estimated quantity if available.

If quantity is not given, ask the user.

Estimate a realistic deadline (in days) for the full project based on standard completion rates ("Becsült kivitelezési idő").

If multiple options are valid (e.g. different material grades or methods), list them all and ask the user for clarification.

Always seek clarity. If the user's message is vague, ask specific questions about:
- surface area (e.g. m²)
- room types (e.g. kitchen, bathroom)
- materials (basic, premium, or customer-provided)
- specific tasks needed (e.g. painting, tiling, demolition)

Your tone is professional, supportive, and concise.

Do not answer questions unrelated to renovation offers.
  
`,
  model: gemini({
    model: "gemini-2.0-flash",
  }),
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
    console.log('AiOfferAgent event received:', JSON.stringify(event, null, 2));
    
    try {
      const { userInput, recordId, userEmail } = event.data;
      console.log('Processing offer letter request:', { userInput, recordId, userEmail });
      
      if (!userInput) {
        throw new Error('Missing userInput in event data');
      }
      
      const result = await AiOfferChatAgent.run(userInput);
      console.log('AiOfferChatAgent result:', JSON.stringify(result, null, 2));
      
      // Save the result to the database using Prisma
      if (recordId) {
        await step.run('save-offer-letter', async () => {
          const historyData = {
            recordId: recordId,
            content: JSON.parse(JSON.stringify(result)), // Convert to plain object
            tenantEmail: userEmail,
            aiAgentType: 'ai-offer-letter',
            metaData: {
              title: 'Ajánlat generálás',
              description: userInput.substring(0, 100) + '...',
            },
            createdAt: new Date().toISOString(),
          };
          
        
          console.log('Saving to history:', JSON.stringify(historyData, null, 2));
          
          const saved = await prisma.history.create({
            data: historyData,
          });
          
          console.log('Saved history record:', saved);
          return saved;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in AiOfferAgent:', error);
      throw error; // Re-throw to mark the function as failed
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
      console.log("Saved to DB:", result);
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
        userEmail: userEmail || 'anonymous@example.com',
        tenantEmail: userEmail || 'anonymous@example.com',
        metaData: typeof userInput === 'string' ? { content: userInput } : userInput,
      };
      
      console.log('Saving roadmap to history:', JSON.stringify(historyData, null, 2));
      
      const result = await prisma.history.create({
        data: historyData,
      });
      
      console.log('Saved roadmap history record:', result);
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
    priority?: 'high' | 'medium' | 'low' | null;
    deadline?: string | null;
    related_to?: 'renovation' | 'offer' | 'inquiry' | 'other' | null;
    sentiment?: 'positive' | 'neutral' | 'negative' | null;
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
    console.log('ProcessBulkEmails function started');
    const { userEmail } = event.data;

    try {
      // Find all emails without a myWorkId and with content
      const emails = await step.run("GetEmailsWithoutWork", async () => {
        return await prisma.$queryRaw<Array<{
          id: number;
          subject: string;
          content: string;
          from: string;
          // Add other fields from your Email model as needed
        }>>`
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
          console.log(`Processing email: ${email.id} - ${email.subject || 'No subject'}`);
          
          // Run the EmailAnalyzerAgent outside of step.run
          const emailContent = email.content as string;
          console.log(`Analyzing email ${email.id} (${email.subject || 'No subject'})`);
          
          let analysisResult: EmailAnalysis = { analysis: {}, summary: { overview: '', next_steps: [] } };
          
          try {
            const result = await EmailAnalyzerAgent.run(emailContent);
            const firstMessage = result.output?.[0];
            let rawContent: string | undefined;

            if (firstMessage && 'content' in firstMessage) {
              // Handle regular message with content
              rawContent = firstMessage.content as string;
            } else if (firstMessage && 'tool_call_id' in firstMessage) {
              // Handle tool call message
              console.error('Received tool call message, but expected text content');
              analysisResult = { analysis: {}, summary: { overview: 'Error: Tool call not supported here', next_steps: [] } };
            }
            
            if (rawContent) {
              // Try to extract JSON from markdown code blocks
              try {
                let jsonString = rawContent;
                
                // Try to find JSON in markdown code blocks
                const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  jsonString = jsonMatch[1];
                }
                
                // Clean up the string before parsing
                jsonString = jsonString.trim();
                
                // If the response starts with a non-JSON text, try to find the actual JSON part
                if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
                  const jsonStart = jsonString.indexOf('{');
                  if (jsonStart > 0) {
                    jsonString = jsonString.substring(jsonStart);
                  }
                }
                
                // Try to parse the JSON
                analysisResult = JSON.parse(jsonString) as EmailAnalysis;
                console.log('Successfully parsed analysis result');
              } catch (error) {
                console.error(`Error parsing analysis for email ${email.id}:`, error);
                console.log('Raw content that failed to parse:', rawContent.substring(0, 500));
                analysisResult = { 
                  analysis: {}, 
                  summary: { 
                    overview: 'Hiba az elemzés feldolgozásakor. Kérjük, ellenőrizd az e-mail tartalmát.', 
                    next_steps: [] 
                  } 
                };
              }
            }
          } catch (error) {
            console.error(`Error running EmailAnalyzerAgent for email ${email.id}:`, error);
            analysisResult = { analysis: {}, summary: { overview: 'Error analyzing email', next_steps: [] } };
          }

          // Extract location from email content or subject
          const location = (email.subject?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() ||
                         (typeof email.content === 'string' ? email.content.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() : '') ||
                         analysisResult.analysis?.requirements?.description?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() ||
                         'Ismeretlen helyszín');

          // Create or find MyWork item
          await step.run(`CreateOrUpdateMyWork-${email.id}`, async () => {
            const emailSubject = email.subject || 'Névtelen munka';
            const fromText = email.from || 'Ismeretlen feladó';
            const emailContent = email.content || '';
            
            // Extract customer name and email from the from field
            const customerName = fromText.split('<')[0]?.trim() || 'Ismeretlen ügyfél';
            const customerEmailMatch = fromText.match(/<([^>]+)>/);
            const customerEmail = customerEmailMatch ? customerEmailMatch[1] : '';
            
            // Create a description with the first 200 chars of the email
            const emailPreview = emailContent.length > 200 
              ? `${emailContent.substring(0, 200)}...` 
              : emailContent;
            const description = `E-mail kapcsolat: ${fromText}\n\n${emailPreview}`;
            
            // Build the where clause for finding existing work
            const whereClause: any = {
              tenantEmail: userEmail,
              OR: [] as any[]
            };
            
            // Only add title condition if email has a subject
            if (email.subject) {
              whereClause.OR.push({ title: email.subject });
            }
            
            // Always include location in the OR condition
            whereClause.OR.push({ location: { equals: location, mode: 'insensitive' } });
            
            // Find existing work that matches either title or location
            const existingWork = await prisma.myWork.findFirst({
              where: whereClause,
              orderBy: { createdAt: 'desc' } // Get the most recent one
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
                  location: existingWork.location || location
                }
              });
              
              // Link email to existing MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: existingWork.id }
              });
              
              console.log(`Linked email ${email.id} to existing MyWork ${existingWork.id}`);
              return { action: 'linked', workId: existingWork.id };
            } else {
              // Create new MyWork with data from email and analysis
              const newWorkData: any = {
                title: emailSubject,
                customerName: customerName,
                customerEmail: customerEmail,
                date: new Date(),
                location: location,
                time: '00:00',
                totalPrice: 0,
                description: description,
                tenantEmail: userEmail,
                workflowId: null,
                // Add additional fields from analysis if available
                customerPhone: analysisResult.analysis?.contact_info?.phone || null
              };
              
              const newWork = await prisma.myWork.create({
                data: newWorkData
              });
              
              // Link email to the new MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: newWork.id }
              });
              
              console.log(`Created new MyWork ${newWork.id} for email ${email.id}`);
              return { action: 'created', workId: newWork.id };
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
      console.error('Error in ProcessBulkEmails:', error);
      throw error;
    }
  }
);

export const EmailAnalyzer = inngest.createFunction(
  { id: "EmailAnalyzer" },
  { event: "EmailAnalyzer" },
  async ({ event, step }) => {
    console.log('EmailAnalyzer function started', { eventId: event.id });
    const { recordId, emailContent, userEmail, metadata = {} } = event.data;
    console.log('Processing analysis for recordId:', recordId);

    try {
      // Analyze the email content using the EmailAnalyzerAgent
      console.log('Running EmailAnalyzerAgent...');
      const analysisResult = await EmailAnalyzerAgent.run(emailContent);
      console.log('EmailAnalyzerAgent completed');

      // @ts-ignore
      const rawContent = analysisResult.output[0].content;
      console.log('Raw analysis content length:', rawContent.length);
      console.log('Raw analysis content (first 500 chars):', rawContent.substring(0, 500));

      // Try to extract JSON from markdown code blocks
      let parsedAnalysis;
      try {
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
        console.log('Extracted JSON string (first 500 chars):', jsonString.substring(0, 500));
        
        parsedAnalysis = JSON.parse(jsonString);
        console.log('Successfully parsed JSON analysis:', JSON.stringify(parsedAnalysis, null, 2));
      } catch (error) {
        console.error("Error parsing JSON from email analysis:", error);
        // If parsing fails, include the raw content for debugging
        parsedAnalysis = {
          error: "Failed to parse email analysis",
          raw_content: rawContent?.substring(0, 500) + (rawContent?.length > 500 ? '...' : ''),
          ...metadata,
        };
        console.log('Fallback analysis content:', parsedAnalysis);
      }

      // Save the analysis to the database using Prisma
      const saveToDb = await step.run("SaveEmailAnalysis", async () => {
        try {
          console.log('Attempting to save to database with recordId:', recordId);
          console.log('Analysis content to save:', JSON.stringify(parsedAnalysis, null, 2));
          
          const data = {
            recordId: recordId,
            content: parsedAnalysis,
            aiAgentType: "/ai-tools/email-analyzer",
            userEmail: userEmail,
            metaData: JSON.stringify({
              ...metadata,
              analysis_timestamp: new Date().toISOString()
            }),
            tenantEmail: userEmail, // Make sure tenantEmail is set
            createdAt: new Date().toISOString()
          };
          
          console.log('Database insert data:', JSON.stringify(data, null, 2));
          
          const result = await prisma.history.create({
            data: data
          });
          
          console.log('Email analysis saved to DB:', {
            recordId: recordId,
            dbId: result.id,
            savedAt: new Date().toISOString()
          });
          
          // Verify the record was saved
          const savedRecord = await prisma.history.findUnique({
            where: { id: result.id }
          });
          console.log('Verified saved record:', {
            id: savedRecord?.id,
            recordId: savedRecord?.recordId,
            aiAgentType: savedRecord?.aiAgentType,
            hasContent: !!savedRecord?.content
          });
          
          return parsedAnalysis;
        } catch (error) {
          console.error('Error saving to database:', error);
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
