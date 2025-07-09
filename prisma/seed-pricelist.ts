import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const priceListData = [
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Helyszíni bejárás, területfelmérés',
      technology: 'Felmérés',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Geodéziai kitűzés (alappontok, szintek)',
      technology: 'Geodéziai műszeres',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Cserjék, bokrok kézi eltávolítása',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Fű, gyomnövény kaszálása',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Fa kivágása (≤15 cm törzsátmérő)',
      technology: 'Kézi láncfűrészes',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Fa kivágása (>15 cm törzsátmérő)',
      technology: 'Gépi vagy darus',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Tuskózás, gyökérmarás',
      technology: 'Gépi tuskómaró',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Humuszréteg eltávolítása és depózása',
      technology: 'Gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Tereprendezés, terepszint gépi kiegyenlítése',
      technology: 'Gépi (kotró/dózer)',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Tereprendezés kézi kiegészítés',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Töltéskészítés földmunkával',
      technology: 'Gépi',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Felvonulási út építése zúzottkőből',
      technology: 'Zúzottkő ágyazattal',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Sitt, törmelék összegyűjtése',
      technology: 'Kézi',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Hulladék elszállítása lerakóba',
      technology: 'Teherautóval',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Talajmechanikai vizsgálat',
      technology: 'Fúrás + labor',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Talajmechanikai szakvélemény készítése',
      technology: 'Szakértői',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Ideiglenes áramvételezési pont kiépítése',
      technology: 'Kábeles csatlakozás',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Ideiglenes vízvételi pont létesítése',
      technology: 'Csatlakozás hálózatra',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Mobil WC telepítése',
      technology: 'Vegyi WC',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Ideiglenes kerítés építése',
      technology: 'Drótfonat/OSB',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Telek előkészítése, tereprendezés',
      task: 'Kapubejáró kialakítása',
      technology: 'Fém vagy fa szerkezet',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Építési helyszín geodéziai felmérése',
      technology: 'GNSS vagy tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Digitális domborzatmodell készítése',
      technology: 'Szoftveres modellezés',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Helyi alappont hálózat telepítése',
      technology: 'GNSS vagy prizmás mérés',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Telekhatárok kitűzése',
      technology: 'Prizmás mérés',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Épület sarokpontjainak (tengelyeinek) kitűzése',
      technology: 'Tachiméterrel',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Alaptestek tengelyeinek kitűzése',
      technology: 'Tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: '±0,00 szintmagasság kitűzése',
      technology: 'Szintezőműszer',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Zsaluzás ellenőrző bemérése',
      technology: 'Tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Falsíkok és nyílásközök bemérése',
      technology: 'Tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Oszlopok, pillérek tengelyének bemérése',
      technology: 'Tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Födémszint magassági ellenőrzése',
      technology: 'Szintezőműszer',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Tetőszerkezet vonalainak bemérése',
      technology: 'Tachiméter',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Süllyedés- vagy mozgásvizsgálat',
      technology: 'Geodéziai monitoring',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Gépészeti vezetékek kitűzése',
      technology: 'Tachiméter',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Geodéziai mérési jegyzőkönyv készítése',
      technology: 'Digitális formátumban',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Koordináta-lista (CSV/DWG)',
      technology: 'Digitális export',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Geodéziai kitűzés',
      task: 'Kivitelezői átadási dokumentáció',
      technology: 'PDF / DWG',
      unit: 'db',
      laborCost: 3500,
      materialCost: 6300,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapozási vonal kitűzése',
      technology: 'Geodéziai műszeres kitűzés',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok nyomvonalának jelölése',
      technology: 'Kézi karózás, festés',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok gépi kiemelése',
      technology: 'Kotró-rakodó gép',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok kézi kiemelése',
      technology: 'Kézi szerszámokkal',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Gépi földkiemelés szűk helyen',
      technology: 'Mini kotrógép',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Föld szállítása depónia területére',
      technology: 'Gépi',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Föld elszállítása lerakóba',
      technology: 'Billencs teherautó',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok fenék szintezése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok oldalainak kézi igazítása',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Vízszintes és függőleges ellenőrzés',
      technology: 'Szintező, műszer',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárok aljának tömörítése',
      technology: 'Vibrációs lemez',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Zúzottkő ágyazat készítése',
      technology: '0/63 mm zúzottkő',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Zúzottkő ágyazat tömörítése',
      technology: 'Vibrációs lemez',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Védőbeton (szegély) készítése',
      technology: 'C12/15',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Védőbeton (réteg) készítése',
      technology: 'C12/15',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Vízelvezető réteg kialakítása',
      technology: 'Geotextília + kavics',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Vízelvezető réteg szűrőrétege',
      technology: 'Geotextília',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárkot vízszigetelése',
      technology: 'PVC fólia',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Alapozási földmunka',
      task: 'Alapárkot feltöltése',
      technology: 'Tisztított homok',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Vasalás előkészítése',
      technology: 'Műanyag támasztók',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Alapozó vasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Falvasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Oszlopvasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Gerendavasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Födémvasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Lépcsővasalás készítése',
      technology: 'B500B vasalás',
      unit: 'kg',
      laborCost: 500,
      materialCost: 900,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Vasalás kötözése',
      technology: 'Kötözőhuzal',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Vasalás távolságtartó elhelyezése',
      technology: 'Műanyag támasztók',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése alapozáshoz',
      technology: 'Deszkázat',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése falakhoz',
      technology: 'Deszkázat vagy panel',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése oszlopokhoz',
      technology: 'Deszkázat vagy panel',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése gerendákhoz',
      technology: 'Deszkázat vagy panel',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése födémekhez',
      technology: 'Tartórendszer',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat készítése lépcsőhöz',
      technology: 'Deszkázat',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat kenése zsírozással',
      technology: 'Zsaluzóolaj',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Betonozás előkészítése',
      technology: 'Tisztítás, nedvesítés',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton szállítása',
      technology: 'Betonpumpa',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton beöntése',
      technology: 'Kézi vagy gépi',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton tömörítése',
      technology: 'Belső vibrátor',
      unit: 'm³',
      laborCost: 4000,
      materialCost: 7200,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton felület kezelése',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton kezelése',
      technology: 'Nedvesítés, takarás',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Zsaluzat bontása',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Beton felület javítása',
      technology: 'Javítóhabarcs',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Hideghézag kialakítása',
      technology: 'Hőszigetelő lap',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vasbeton szerkezetek',
      task: 'Vasalás védőrétege ellenőrzése',
      technology: 'Műszeres vagy kézi',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Tégla falazat készítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Blokk falazat készítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Hőszigetelő falazat készítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Vasalt falazat készítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Önhordó falazat készítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Hőtükör kialakítása',
      technology: 'Hőtükrös falazat',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Falazat megerősítése',
      technology: 'Műanyag vagy acál háló',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Falazat javítása',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Falazat tisztítása',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Falazott szerkezetek',
      task: 'Falazat hidrofób kezelése',
      technology: 'Hidrofób szer',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Fal hőszigetelése külső oldalon',
      technology: 'XPS vagy EPS lapok',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Fal hőszigetelése belső oldalon',
      technology: 'Mineralit vagy EPS',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Pince hőszigetelése',
      technology: 'XPS vagy EPS lapok',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Tetőtér hőszigetelése',
      technology: 'Állványzatos vagy széthintett',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Tető hőszigetelése',
      technology: 'Állványzatos vagy széthintett',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Padló hőszigetelése',
      technology: 'XPS vagy EPS lapok',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Ablak-ajtó betétek hőszigetelése',
      technology: 'Hőtükör és hab',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Hőhíd menti hőszigetelés',
      technology: 'Hőtükör és hab',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Hőszigetelő ragasztó hab',
      technology: 'Hőszigetelő hab',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Hőszigetelések',
      task: 'Hőszigetelő ragasztó hab',
      technology: 'Hőszigetelő hab',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Helyszíni bejárás, területfelmérés',
      technology: 'Felmérés',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Falfelület előkészítése vakoláshoz',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Hegesztőháló felhelyezése',
      technology: 'Műanyag vagy üvegszálas háló',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Aljzat javító vakolás',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Alapvakolás',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Simítóvakolás',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Porszívózás utáni simítás',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Vakolat felület kezelése',
      technology: 'Kezelő szer',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Vakolat javítása',
      technology: 'Javító vakolat',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Vakolás, simítás',
      task: 'Vakolat felület védelme',
      technology: 'Védőfólia',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Helyszíni bejárás, területfelmérés',
      technology: 'Felmérés',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Felület előkészítése burkoláshoz',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Aljzat kiegyenlítése',
      technology: 'Nivelláló anyag',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Hőszigetelő réteg kialakítása',
      technology: 'XPS vagy EPS lapok',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Vízszigetelő réteg kialakítása',
      technology: 'Vízszigetelő membrán',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Rács kialakítása',
      technology: 'Műanyag vagy alumínium',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Burkolólapok elhelyezése',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Fugázás',
      technology: 'Fugaanyag',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Burkolat védelme',
      technology: 'Védőfólia',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Burkolatok',
      task: 'Burkolat tisztítása',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Helyszíni bejárás, területfelmérés',
      technology: 'Felmérés',
      unit: 'db',
      laborCost: 3000,
      materialCost: 5400,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Felület előkészítése festéshez',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Aljzat javítása',
      technology: 'Javító anyag',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Alapozó festék felvitele',
      technology: 'Alapozó festék',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Festés',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Tapétázás előkészítése',
      technology: 'Kézi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Tapéta felragasztása',
      technology: 'Tapétaragasztó',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Tapéta varrásainak eltüntetése',
      technology: 'Kitöltő anyag',
      unit: 'fm',
      laborCost: 1200,
      materialCost: 2160,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Felület védelme',
      technology: 'Védőfólia',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    },
    {
      category: 'Festés, tapétázás',
      task: 'Felület tisztítása',
      technology: 'Kézi vagy gépi',
      unit: 'm²',
      laborCost: 1500,
      materialCost: 2700,
      tenantEmail: 'default@example.com'
    }
  ];

  for (const data of priceListData) {
    await prisma.priceList.upsert({
      where: {
        task_tenantEmail: {
          task: data.task,
          tenantEmail: data.tenantEmail
        }
      },
      update: {},
      create: data,
    });
  }

  console.log('PriceList data has been seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
