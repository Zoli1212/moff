import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Törlöm a meglévő adatokat
  console.log("Meglévő PriceList adatok törlése...");
  await prisma.priceList.deleteMany({});
  console.log("PriceList adatok sikeresen törölve!");

  const priceListData = [
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
    "laborCost": 5000,
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
    "task": "Padlólap ragasztása (60x60 cm felett)",
    "technology": "Szintező rendszerrel",
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
    "category": "Festés, mázolás",
    "task": "Felületek portalanítása, glettelés",
    "technology": "1-2 réteg",
    "unit": "m²",
    "laborCost": 5000,
    "materialCost": 500
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
  ];

for (const data of priceListData) {
  await prisma.priceList.upsert({
    where: {
      task_tenantEmail: {
        task: data.task,
        tenantEmail: "",
      },
    },
    update: {
      laborCost: data.laborCost,
      materialCost: data.materialCost,
      category: data.category,
      technology: data.technology,
      unit: data.unit,
    },
    create: {
      ...data,
      tenantEmail: "",
    },
  });
}

console.log("PriceList data has been seeded with tenantEmail = ''");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
