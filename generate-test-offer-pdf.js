const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a new PDF document
const doc = new PDFDocument({ margin: 50 });

// Pipe to file
doc.pipe(fs.createWriteStream('test-meglevo-ajanlat.pdf'));

// Helper function to add a line
const addLine = (y) => {
  doc.moveTo(50, y)
     .lineTo(550, y)
     .stroke();
};

// Title
doc.fontSize(20)
   .font('Helvetica-Bold')
   .text('ÉPÍTÉSI AJÁNLAT', { align: 'center' });

doc.moveDown();
addLine(doc.y);
doc.moveDown();

// Header information
doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Ajánlat címe: ', { continued: true })
   .font('Helvetica')
   .text('Fürdőszoba teljes felújítása');

doc.font('Helvetica-Bold')
   .text('Készítette: ', { continued: true })
   .font('Helvetica')
   .text('Nagy Építőipari Bt.');

doc.font('Helvetica-Bold')
   .text('Dátum: ', { continued: true })
   .font('Helvetica')
   .text('2026. január 13.');

doc.font('Helvetica-Bold')
   .text('Helyszín: ', { continued: true })
   .font('Helvetica')
   .text('Budapest, XI. kerület, Bartók Béla út 89.');

doc.font('Helvetica-Bold')
   .text('Terület: ', { continued: true })
   .font('Helvetica')
   .text('12 m²');

doc.moveDown();
addLine(doc.y);
doc.moveDown();

// Description
doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Projekt leírása:');

doc.fontSize(11)
   .font('Helvetica')
   .text('A fürdőszoba komplett felújítása a teljes bontástól a kulcsrakész átadásig. ' +
         'A projekt magában foglalja az összes szaniter és csempe cseréjét, új zuhanykabint, ' +
         'korszerű LED világítást és vízvezeték rendszer felújítását. ' +
         'Becsült kivitelezési idő: 2-3 hét.', { align: 'justify' });

doc.moveDown();
addLine(doc.y);
doc.moveDown(0.5);

// Items table header
doc.fontSize(11)
   .font('Helvetica-Bold')
   .text('MUNKÁK ÉS ANYAGOK RÉSZLETEZÉSE', { align: 'center' });

doc.moveDown(0.5);

// Table structure
const tableTop = doc.y;
const col1 = 50;   // Sorszám
const col2 = 80;   // Megnevezés
const col3 = 320;  // Mennyiség
const col4 = 380;  // Egység
const col5 = 430;  // Egységár
const col6 = 490;  // Összesen

// Table header
doc.fontSize(9)
   .font('Helvetica-Bold');

doc.text('Sz.', col1, tableTop);
doc.text('Megnevezés', col2, tableTop);
doc.text('Menny.', col3, tableTop);
doc.text('Egység', col4, tableTop);
doc.text('Egységár', col5, tableTop);
doc.text('Összesen', col6, tableTop);

let yPos = tableTop + 20;
addLine(yPos - 5);

// Items data
const items = [
  { section: 'BONTÁSI MUNKÁK' },
  { num: 1, name: 'Régi csempe bontása', qty: 30, unit: 'm²', price: 4000, total: 120000 },
  { num: 2, name: 'Szaniterek elbontása', qty: 1, unit: 'komplett', price: 45000, total: 45000 },
  { num: 3, name: 'Régi vízvezetékek bontása', qty: 1, unit: 'komplett', price: 35000, total: 35000 },
  { subtotal: 'Bontás összesen:', value: 200000 },

  { section: 'VÍZVEZETÉK ÉS CSATORNA' },
  { num: 4, name: 'Új vízvezeték kiépítése', qty: 1, unit: 'komplett', price: 180000, total: 180000 },
  { num: 5, name: 'Csatornarendszer felújítása', qty: 1, unit: 'komplett', price: 120000, total: 120000 },
  { num: 6, name: 'Nyomáspróba és tesztelés', qty: 1, unit: 'alkalom', price: 25000, total: 25000 },
  { subtotal: 'Vízvezeték összesen:', value: 325000 },

  { section: 'BURKOLÁSI MUNKÁK' },
  { num: 7, name: 'Falburkolás 30x60 cm csempe', qty: 30, unit: 'm²', price: 15000, total: 450000, note: 'Anyaggal' },
  { num: 8, name: 'Padlóburkolás 60x60 cm járólap', qty: 12, unit: 'm²', price: 16000, total: 192000, note: 'Anyaggal' },
  { num: 9, name: 'Vízelvezető lejtés kialakítása', qty: 12, unit: 'm²', price: 4500, total: 54000 },
  { subtotal: 'Burkolás összesen:', value: 696000 },

  { section: 'SZANITEREK ÉS SZERELVÉNYEK' },
  { num: 10, name: 'Zuhanykabín 90x90 cm', qty: 1, unit: 'db', price: 185000, total: 185000, note: 'Prémium' },
  { num: 11, name: 'Mosdókagyló+csaptelep', qty: 1, unit: 'db', price: 95000, total: 95000 },
  { num: 12, name: 'WC csésze fali', qty: 1, unit: 'db', price: 75000, total: 75000 },
  { num: 13, name: 'Mosdószekrény LED világítással', qty: 1, unit: 'db', price: 120000, total: 120000 },
  { num: 14, name: 'Zuhanyfej esőztető funkcióval', qty: 1, unit: 'db', price: 45000, total: 45000 },
  { subtotal: 'Szaniterek összesen:', value: 520000 },

  { section: 'VILLANYSZERELÉS' },
  { num: 15, name: 'LED spotlámpák', qty: 6, unit: 'db', price: 12000, total: 72000 },
  { num: 16, name: 'Vízálló kapcsolók', qty: 3, unit: 'db', price: 8500, total: 25500 },
  { num: 17, name: 'Fűtött törölközőszárító radiátor', qty: 1, unit: 'db', price: 85000, total: 85000 },
  { subtotal: 'Villanyszerelés összesen:', value: 182500 },

  { section: 'EGYÉB MUNKÁK' },
  { num: 18, name: 'Szellőzőrendszer kiépítése', qty: 1, unit: 'db', price: 65000, total: 65000 },
  { num: 19, name: 'Festés, simítás', qty: 1, unit: 'komplett', price: 45000, total: 45000 },
  { num: 20, name: 'Törmelék elszállítása', qty: 4, unit: 'm³', price: 18000, total: 72000 },
  { num: 21, name: 'Takarítás, átvételre készítés', qty: 1, unit: 'alkalom', price: 35000, total: 35000 },
  { subtotal: 'Egyéb munkák összesen:', value: 217000 },
];

// Render items
doc.font('Helvetica');

items.forEach((item) => {
  // Check if we need a new page
  if (yPos > 700) {
    doc.addPage();
    yPos = 50;
  }

  if (item.section) {
    // Section header
    yPos += 10;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(item.section, col1, yPos);
    yPos += 15;
  } else if (item.subtotal) {
    // Subtotal row
    yPos += 5;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text(item.subtotal, col3, yPos, { width: 150, align: 'right' })
       .text(item.value.toLocaleString('hu-HU') + ' Ft', col6, yPos, { align: 'right' });
    yPos += 20;
  } else {
    // Regular item row
    doc.fontSize(9)
       .font('Helvetica')
       .text(item.num.toString(), col1, yPos)
       .text(item.name, col2, yPos, { width: 230 })
       .text(item.qty.toString(), col3, yPos)
       .text(item.unit, col4, yPos)
       .text(item.price.toLocaleString('hu-HU'), col5, yPos, { align: 'right' })
       .text(item.total.toLocaleString('hu-HU'), col6, yPos, { align: 'right' });

    if (item.note) {
      yPos += 12;
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .fillColor('gray')
         .text('(' + item.note + ')', col2, yPos);
      doc.fillColor('black');
    }

    yPos += 18;
  }
});

// Grand total
yPos += 10;
addLine(yPos);
yPos += 15;

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('NETTÓ VÉGÖSSZEG:', col3, yPos, { width: 150, align: 'right' })
   .text('2 140 500 Ft', col6, yPos, { align: 'right' });

yPos += 20;
doc.text('ÁFA (27%):', col3, yPos, { width: 150, align: 'right' })
   .text('577 935 Ft', col6, yPos, { align: 'right' });

yPos += 25;
doc.fontSize(14)
   .fillColor('orange')
   .text('BRUTTÓ VÉGÖSSZEG:', col3, yPos, { width: 150, align: 'right' })
   .text('2 718 435 Ft', col6, yPos, { align: 'right' });

doc.fillColor('black');

// New page for terms
doc.addPage();

doc.fontSize(14)
   .font('Helvetica-Bold')
   .text('FIZETÉSI FELTÉTELEK ÉS GARANCIÁK', { align: 'center' });

doc.moveDown();

doc.fontSize(11)
   .font('Helvetica-Bold')
   .text('Fizetési ütemezés:');

doc.font('Helvetica')
   .text('• Előleg: 40% a szerződéskötéskor (1,087,374 Ft)')
   .text('• Második részlet: 30% a burkolási munkák befejezésekor (815,531 Ft)')
   .text('• Végösszeg: 30% az átadás-átvételkor (815,530 Ft)');

doc.moveDown();

doc.font('Helvetica-Bold')
   .text('Garancia:');

doc.font('Helvetica')
   .text('• Kivitelezési munkákra: 5 év garancia')
   .text('• Beépített anyagokra: gyártói garancia szerint')
   .text('• Szaniter berendezésekre: 2-5 év gyártói garancia');

doc.moveDown();

doc.font('Helvetica-Bold')
   .text('Határidők:');

doc.font('Helvetica')
   .text('• Munkakezdés: szerződéskötéstől számított 1 héten belül')
   .text('• Befejezés: munkakezdéstől számított 2-3 hét')
   .text('• Pontos ütemterv a szerződésben kerül rögzítésre');

doc.moveDown();

doc.font('Helvetica-Bold')
   .text('Egyéb információk:');

doc.font('Helvetica')
   .text('• Az ajánlat 30 napig érvényes')
   .text('• Az ár tartalmazza az összes munkadíjat és anyagköltséget')
   .text('• A megbízó biztosítja az áram és víz ellátást')
   .text('• Parkolási lehetőség szükséges a kivitelezés idejére')
   .text('• A munkaterület naponta takarítva lesz')
   .text('• Minden hulladék és törmelék elszállítása az árban foglalt');

doc.moveDown(2);
addLine(doc.y);
doc.moveDown();

doc.fontSize(10)
   .font('Helvetica')
   .text('Nagy Építőipari Bt.', { align: 'center' })
   .text('1117 Budapest, Irinyi József utca 42.', { align: 'center' })
   .text('Tel: +36 30 123 4567 | Email: info@nagyepito.hu', { align: 'center' })
   .text('Adószám: 12345678-2-43', { align: 'center' });

// Finalize PDF
doc.end();

console.log('✅ PDF ajánlat létrehozva: test-meglevo-ajanlat.pdf');
console.log('\nAz ajánlat tartalma:');
console.log('- Cím: Fürdőszoba teljes felújítása');
console.log('- Helyszín: Budapest, XI. kerület');
console.log('- Terület: 12 m²');
console.log('- Tételek száma: 21 db');
console.log('- Kategóriák: Bontás, Vízvezeték, Burkolás, Szaniterek, Villanyszerelés, Egyéb');
console.log('- Bruttó végösszeg: 2,718,435 Ft');
console.log('\nFeltöltheted ezt a PDF-et a "Meglévő ajánlat feltöltése" gombbal!');
