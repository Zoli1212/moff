const jsPDF = require('jspdf').jsPDF;
const fs = require('fs');

// Create a new PDF document
const doc = new jsPDF();

// Title
doc.setFontSize(18);
doc.setFont('helvetica', 'bold');
doc.text('AJANLATKERES - Nappali felujitas', 20, 20);

// Date
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('Datum: 2026. januar 12.', 20, 30);

// Section 1: Project description
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.text('Projekt leirasa:', 20, 45);

doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.text('A nappali teljes felujitasa Szolnokon, Petofi Sandor utca 2.', 20, 55);
doc.text('', 20, 60);
doc.text('A munkak:', 20, 65);
doc.text('- Falak burkolasa es festese', 25, 72);
doc.text('- Padlo csereje (parketta)', 25, 79);
doc.text('- Villanyszereles (uj kapcsolok, konnektorok)', 25, 86);
doc.text('- Gipszkarton mennyezet', 25, 93);
doc.text('- Ajto csere', 25, 100);
doc.text('', 20, 105);
doc.text('Terulet: 30 nm', 20, 110);
doc.text('Hatarideje: 2026. februar 28.', 20, 117);
doc.text('Helyszin: Szolnok, Petofi Sandor utca 2', 20, 124);

// Section 2: Materials
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.text('Szukseges anyagok:', 20, 140);

doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.text('1. Falfestes: 30 m2 - Belteri fal festek', 20, 150);
doc.text('2. Parketta: 30 m2 - Tolgy parketta 8mm', 20, 157);
doc.text('3. Villanyszereles: 1 db - Kapcsolok, konnektorok, kabelek', 20, 164);
doc.text('4. Gipszkarton: 30 m2 - Mennyezeti gipszkarton lemez', 20, 171);
doc.text('5. Ajto: 1 db - Belteri ajto tokkal', 20, 178);

// Section 3: Additional notes
doc.setFontSize(12);
doc.setFont('helvetica', 'bold');
doc.text('Tovabbi informaciok:', 20, 195);

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('- Minden anyagot a kivitelezo biztosit', 20, 205);
doc.text('- Munkavegzes munkanapokon 8-17 ora kozott', 20, 212);
doc.text('- Elvarjuk a tiszta, rendezett munkavegzest', 20, 219);
doc.text('- A keletkezett hulladekot a kivitelezo szallitja el', 20, 226);

// Footer
doc.setFontSize(9);
doc.setTextColor(128);
doc.text('Kerunk reszletes arajanlatot a fenti munkakra.', 20, 270);
doc.text('Kapcsolat: info@pelda.hu, +36 30 123 4567', 20, 277);

// Save the PDF
const pdfBuffer = doc.output('arraybuffer');
fs.writeFileSync('c:\\Users\\mzolt\\Desktop\\Mobile\\off\\test-ajanlatkeres.pdf', Buffer.from(pdfBuffer));

console.log('PDF sikesen letrehozva: test-ajanlatkeres.pdf');
