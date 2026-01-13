const XLSX = require('xlsx');
const fs = require('fs');

// Create a realistic contractor offer with items
const offerData = {
  'Ajánlat adatok': [
    ['ÉPÍTÉSI AJÁNLAT'],
    [''],
    ['Ajánlat címe:', 'Konyha és nappali felújítása'],
    ['Készítette:', 'Kovács Építőipari Kft.'],
    ['Dátum:', '2026. január 13.'],
    ['Helyszín:', 'Budapest, XIII. kerület, Váci út 45.'],
    ['Terület:', '35 m²'],
    [''],
    ['Projekt leírása:'],
    ['A konyha és nappali teljes felújítása, beleértve a burkolást, festést,'],
    ['elektromos munkákat és új bútorok beszerelését. A munkálatok kb. 3-4 hetet'],
    ['vesznek igénybe. A megbízó által biztosított anyagok nincsenek, minden'],
    ['anyag a kivitelező által kerül beszerzésre.'],
  ],
  'Munkák részletezése': [
    ['Sorszám', 'Munka megnevezése', 'Mennyiség', 'Egység', 'Egységár (Ft)', 'Összesen (Ft)', 'Megjegyzés'],
    [''],
    ['BONTÁSI MUNKÁK'],
    [1, 'Régi járólap bontása', 35, 'm²', 3500, 122500, 'Takarítással együtt'],
    [2, 'Régi csempe lebontása falról', 25, 'm²', 4000, 100000, ''],
    [3, 'Régi konyhaszekrények elbontása', 8, 'fm', 5000, 40000, 'Elszállítással'],
    [4, 'Gipszkarton válaszfal bontása', 6, 'm²', 3000, 18000, ''],
    ['', '', '', '', 'Bontás összesen:', 280500, ''],
    [''],
    ['BURKOLÁSI MUNKÁK'],
    [5, 'Padlóburkolás 60x60 cm csempével', 35, 'm²', 12000, 420000, 'Anyaggal együtt'],
    [6, 'Falburkolás konyhában 30x60 cm', 25, 'm²', 14000, 350000, 'Anyaggal együtt'],
    [7, 'Járólapszegély felhelyezése', 18, 'fm', 2500, 45000, ''],
    ['', '', '', '', 'Burkolás összesen:', 815000, ''],
    [''],
    ['FESTÉSI MUNKÁK'],
    [8, 'Falak glettelése, csiszolása', 75, 'm²', 3500, 262500, ''],
    [9, 'Belső falfestés (2 réteg)', 75, 'm²', 2800, 210000, 'Prémium minőségű festék'],
    [10, 'Mennyezet festése', 35, 'm²', 3200, 112000, ''],
    ['', '', '', '', 'Festés összesen:', 584500, ''],
    [''],
    ['ELEKTROMOS MUNKÁK'],
    [11, 'Új aljzatok kiépítése', 12, 'db', 18000, 216000, 'Anyaggal együtt'],
    [12, 'Konyhapult alatti dugaljsor', 1, 'db', 45000, 45000, '5-ös dugaljsor LED világítással'],
    [13, 'LED spotlámpák beszerelése', 8, 'db', 12000, 96000, 'Anyaggal együtt'],
    [14, 'Kapcsolók cseréje', 6, 'db', 8000, 48000, ''],
    ['', '', '', '', 'Villanyszerelés összesen:', 405000, ''],
    [''],
    ['ASZTALOS MUNKÁK'],
    [15, 'Egyedi konyhaszekrények készítése', 8, 'fm', 95000, 760000, 'Fehér magasfényű fronttal'],
    [16, 'Munkalap beszerelése', 4.2, 'fm', 35000, 147000, 'Kvarc munkalap'],
    [17, 'Mosogató kivágása, beszerelése', 1, 'db', 25000, 25000, ''],
    ['', '', '', '', 'Asztalos munkák összesen:', 932000, ''],
    [''],
    ['EGYÉB KÖLTSÉGEK'],
    [18, 'Törmelék elszállítása', 6, 'm³', 15000, 90000, ''],
    [19, 'Takarítás, átvételre készítés', 1, 'alkalom', 45000, 45000, ''],
    ['', '', '', '', 'Egyéb költségek összesen:', 135000, ''],
    [''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', 'NETTÓ VÉGÖSSZEG:', 3152000, ''],
    ['', '', '', '', 'ÁFA (27%):', 851040, ''],
    ['', '', '', '', 'BRUTTÓ VÉGÖSSZEG:', 4003040, ''],
  ],
  'Megjegyzések': [
    ['FIZETÉSI FELTÉTELEK:'],
    ['- Előleg: 30% a szerződéskötéskor'],
    ['- Második részlet: 40% a burkolási munkák befejezésekor'],
    ['- Végösszeg: 30% az átvételkor'],
    [''],
    ['GARANCIA:'],
    ['- Kivitelezési munkákra: 5 év'],
    ['- Beépített anyagokra: a gyártó szerinti garancia'],
    [''],
    ['HATÁRIDŐK:'],
    ['- Munkakezdés: a szerződéskötéstől számított 1 héten belül'],
    ['- Befejezés: munkakezdéstől számított 4 hét'],
    [''],
    ['EGYÉB INFORMÁCIÓK:'],
    ['- Az ár tartalmazza az összes munkadíjat és anyagköltséget'],
    ['- A megbízó biztosítja a munkaterület áram és víz ellátását'],
    ['- Parkolási lehetőséget kérünk a kivitelezés idejére'],
  ],
};

// Create workbook
const workbook = XLSX.utils.book_new();

// Add each sheet
Object.keys(offerData).forEach((sheetName) => {
  const worksheet = XLSX.utils.aoa_to_sheet(offerData[sheetName]);

  // Set column widths for better readability
  if (sheetName === 'Munkák részletezése') {
    worksheet['!cols'] = [
      { wch: 8 },  // Sorszám
      { wch: 35 }, // Munka megnevezése
      { wch: 10 }, // Mennyiség
      { wch: 8 },  // Egység
      { wch: 15 }, // Egységár
      { wch: 15 }, // Összesen
      { wch: 30 }, // Megjegyzés
    ];
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
});

// Write to file
const fileName = 'test-meglevo-ajanlat.xlsx';
XLSX.writeFile(workbook, fileName);

console.log(`✅ Teszt ajánlat létrehozva: ${fileName}`);
console.log('\nAz ajánlat tartalma:');
console.log('- Cím: Konyha és nappali felújítása');
console.log('- Helyszín: Budapest, XIII. kerület');
console.log('- Terület: 35 m²');
console.log('- Tételek száma: 19 db');
console.log('- Kategóriák: Bontás, Burkolás, Festés, Villanyszerelés, Asztalos, Egyéb');
console.log('- Bruttó végösszeg: 4,003,040 Ft');
console.log('\nFeltöltheted ezt a fájlt a "Meglévő ajánlat feltöltése" gombbal!');
