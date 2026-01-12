const XLSX = require('xlsx');

// Create workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Projekt adatok
const projectData = [
  ['AJANLATKERES - Furdoszoba felujitas'],
  [''],
  ['Datum:', '2026. januar 12.'],
  ['Helyszin:', 'Budapest, Andrassy ut 45'],
  ['Terulet:', '12 nm'],
  ['Hatarideje:', '2026. marcius 15.'],
  [''],
  ['Leiras:'],
  ['A furdoszoba teljes felujitasa a kovetkezoket foglalja magaban:'],
  ['- Regi burkolas eltavolitasa'],
  ['- Uj csempe burkolasa (fal es padlo)'],
  ['- Szaniterek csereje (WC, mosdokagylo, zuhanykabin)'],
  ['- Csovezetek csereje'],
  ['- Villanyszereles'],
  [''],
  ['Tovabbi informaciok:'],
  ['- Minden anyagot a kivitelezo biztosit'],
  ['- Munkavegzes hetfotol-pentekig 8-17 ora kozott'],
  ['- A hulladekot a kivitelezo szallitja el'],
];

const wsProject = XLSX.utils.aoa_to_sheet(projectData);
XLSX.utils.book_append_sheet(wb, wsProject, 'Projekt adatok');

// Sheet 2: Anyagok
const materialsData = [
  ['Anyag megnevezese', 'Mennyiseg', 'Egyseg', 'Megjegyzes'],
  ['Fali csempe', '18', 'm2', '20x60 cm, feher'],
  ['Padlo csempe', '12', 'm2', '30x30 cm, szurke'],
  ['WC cseszealj', '1', 'db', 'Fali, modern'],
  ['Mosdokagylo', '1', 'db', 'Szekrennyel egyutt'],
  ['Zuhanykabin', '1', 'db', '80x80 cm, biztonsagi uveg'],
  ['Csemperagaszto', '2', 'zsak', '25 kg'],
  ['Fugazo', '5', 'kg', 'Feher'],
  ['Csovek', '1', 'komplett', 'HidegMeleg viz'],
  ['Villanyszereles', '1', 'komplett', 'Kapcsolok, lampak, kabelezes'],
];

const wsMaterials = XLSX.utils.aoa_to_sheet(materialsData);
wsMaterials['!cols'] = [
  { wch: 30 },
  { wch: 12 },
  { wch: 10 },
  { wch: 40 },
];
XLSX.utils.book_append_sheet(wb, wsMaterials, 'Anyagok');

// Save workbook
XLSX.writeFile(wb, 'c:\\Users\\mzolt\\Desktop\\Mobile\\off\\test-ajanlatkeres.xlsx');

console.log('Excel sikesen letrehozva: test-ajanlatkeres.xlsx');
