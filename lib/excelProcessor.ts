import ExcelJS from 'exceljs';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Excel sor típusa
interface ExcelRow {
  'Ssz.': string | number;
  'Tételszám': string;
  'Tétel szövege': string;
  'Menny.': number;
  'Egység': string;
  'Anyag egységár'?: number;
  'Díj egységre'?: number;
  'Anyag összesen'?: number;
  'Díj összesen'?: number;
  'Összesen'?: number;
  [key: string]: any;
}

interface AIPricing {
  materialPrice: number;
  laborPrice: number;
}

export async function processExcelWithAI(fileBuffer: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> {
  console.log('\n=== Excel feldolgozás elindult ===');
  const workbook = new ExcelJS.Workbook();

  try {
    console.log('Excel fájl betöltése...');
    const excelBuffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer));

    await workbook.xlsx.load(excelBuffer as any);
    console.log(`Excel fájl betöltve, ${workbook.worksheets.length} munkalap található`);
  } catch (error) {
    console.error('Hiba az Excel fájl betöltése közben:', error);
    throw new Error('Nem sikerült betölteni az Excel fájlt: ' + (error instanceof Error ? error.message : String(error)));
  }

  for (const worksheet of workbook.worksheets) {
    console.log(`\nFeldolgozás alatt: '${worksheet.name}' munkalap`);
    
    const headerRow = worksheet.getRow(1);
    if (!headerRow?.values) {
      console.log('  Nincs fejléc sor, munkalap kihagyva');
      continue;
    }

    const headers = (Array.isArray(headerRow.values) 
      ? headerRow.values 
      : Object.values(headerRow.values))
      .filter((v): v is string | number => v !== null && v !== undefined && v !== '')
      .map(String);

    console.log('  Fejlécek:', headers);

    const rows: ExcelRow[] = [];
    let processedRows = 0;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Fejléc sor kihagyása

      const rowData: Partial<ExcelRow> = {};
      let hasData = false;
      let rowValues: any[] = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value as any;
          rowValues.push(`${header}: ${cell.value}`);
          hasData = true;
        }
      });

      if (hasData && rowData['Tétel szövege']) {
        rows.push(rowData as ExcelRow);
        processedRows++;
        if (processedRows <= 3) { // Csak az első néhány sor részletes logolása
          console.log(`  Sor ${rowNumber} adatai:`, rowValues.join(', '));
        }
      }
    });
    
    console.log(`  Feldolgozott sorok: ${processedRows} db`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const tetelSzovege = row['Tétel szövege'];
      
      console.log(`\n  Folyamatban: ${i + 1}/${rows.length} sor (${Math.round((i + 1) / rows.length * 100)}%)`);
      console.log(`  Tétel: ${tetelSzovege?.toString().substring(0, 80)}${tetelSzovege && tetelSzovege.length > 80 ? '...' : ''}`);

      // Mennyiség kezelése
      let mennyiseg: string | number | null | undefined = row['Menny.'];
      // Csak akkor írunk be 1-et, ha nincs érték vagy érvénytelen
      if (mennyiseg === undefined || mennyiseg === null || 
          (typeof mennyiseg === 'number' && isNaN(mennyiseg))) {
        mennyiseg = 1;
        row['Menny.'] = 1; // Csak akkor írjuk felül, ha üres/érvénytelen
      } else if (typeof mennyiseg === 'string') {
        // Ha stringként van megadva, akkor próbáljuk számmá alakítani
        const num = parseFloat(mennyiseg);
        if (!isNaN(num)) {
          mennyiseg = num;
        } else {
          mennyiseg = 1;
          row['Menny.'] = 1;
        }
      }
      // Egység kezelése - 'db' beírása, ha üres vagy érvénytelen, egyébként megtartani az eredeti értéket
      let egyseg = row['Egység'];
      if (egyseg === undefined || egyseg === null || 
          (typeof egyseg === 'string' && egyseg.trim() === '') ||
          (typeof egyseg !== 'string' && typeof egyseg !== 'number')) {
        egyseg = 'db';
        row['Egység'] = 'db';
      }

      console.log(`  Mennyiség: ${mennyiseg} ${egyseg}`);

      try {
        console.log('  AI árazás lekérése...');
        const startTime = Date.now();
        const prices = await getAIPricing(tetelSzovege, egyseg);
        const duration = (Date.now() - startTime) / 1000;
        
        console.log(`  AI válasz érkezett (${duration.toFixed(1)} mp):`, prices);
        
        // Árak és összegek kiszámítása
        row['Anyag egységár'] = prices.materialPrice;
        row['Díj egységre'] = prices.laborPrice;
        row['Anyag összesen'] = Math.round(mennyiseg * prices.materialPrice * 100) / 100;
        row['Díj összesen'] = Math.round(mennyiseg * prices.laborPrice * 100) / 100;
        row['Összesen'] = Math.round((row['Anyag összesen'] + row['Díj összesen']) * 100) / 100;
        
        console.log('  Számolt összegek:', {
          'Anyag összesen': row['Anyag összesen'],
          'Díj összesen': row['Díj összesen'],
          'Összesen': row['Összesen']
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`  Hiba a sor feldolgozásakor (${i + 2}. sor):`, errorMessage);
        
        // Hiba esetén alapértelmezett értékek beállítása
        const defaults = {
          'Anyag egységár': 0,
          'Díj egységre': 0,
          'Anyag összesen': 0,
          'Díj összesen': 0,
          'Összesen': 0
        };
        
        Object.assign(row, defaults);
        console.log('  Alapértelmezett értékek beállítva a hibás sorhoz');
      }
    }

    // Visszaírás
    rows.forEach((row, i) => {
      const excelRow = worksheet.getRow(i + 2);
      headers.forEach((key, idx) => {
        if (key in row) {
          excelRow.getCell(idx + 1).value = row[key];
        }
      });
    });

    // --- MUNKANEM sor frissítése összesítéssel ---
    const totalMaterial = rows.reduce((sum, r) => sum + (r['Anyag összesen'] || 0), 0);
    const totalLabor = rows.reduce((sum, r) => sum + (r['Díj összesen'] || 0), 0);
    const total = Math.round((totalMaterial + totalLabor) * 100) / 100;

    const munkanemRowIndex = rows.findIndex((row) =>
      String(row['Tétel szövege']).toLowerCase().includes('munkanem')
    );

    if (munkanemRowIndex !== -1) {
      console.log(`  ➕ Munkanem sor frissítése (${munkanemRowIndex + 2}. sor)`);

      const munkanemRow = worksheet.getRow(munkanemRowIndex + 2); // +2, mert 1 index + fejléc
      const anyagOsszesenCol = headers.indexOf('Anyag összesen');
      const dijOsszesenCol = headers.indexOf('Díj összesen');
      const osszesenCol = headers.indexOf('Összesen');

      if (anyagOsszesenCol !== -1) munkanemRow.getCell(anyagOsszesenCol + 1).value = totalMaterial;
      if (dijOsszesenCol !== -1) munkanemRow.getCell(dijOsszesenCol + 1).value = totalLabor;
      if (osszesenCol !== -1) munkanemRow.getCell(osszesenCol + 1).value = total;

      munkanemRow.commit();
    } else {
      console.warn('⚠️  Nem található Munkanem sor!');
    }
  }

  return await workbook.xlsx.writeBuffer();
}

async function getAIPricing(item: string, unit: string): Promise<AIPricing> {
  console.log(`\n[getAIPricing] Starting for item: ${item} (${unit})`);
  
  try {
    console.log('[getAIPricing] Creating OpenAI completion...');
    const prompt = `Add meg az alábbi építőipari tétel anyag- és munkadíját (${unit}): ${item}`;
    console.log('[getAIPricing] Prompt:', prompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Te egy építőipari szakértő vagy, aki pontos árakat ad építőanyagokra és munkadíjakra.
Válaszolj CSAK JSON formátumban:
{ "materialPrice": number, "laborPrice": number }
Az árak forintban legyenek. Ha nem tudod biztosan, becsüld meg.`,
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    console.log('[getAIPricing] Received response from OpenAI');
    
    const content = completion.choices[0]?.message?.content;
    console.log('[getAIPricing] Raw response content:', content);
    
    if (!content) {
      throw new Error('AI válasz üres');
    }

    let result: AIPricing;
    try {
      result = JSON.parse(content) as AIPricing;
      console.log('[getAIPricing] Parsed JSON:', result);
    } catch (parseError) {
      console.error('[getAIPricing] JSON parse error:', parseError);
      throw new Error(`Érvénytelen JSON válasz: ${content}`);
    }

    // Validate the response structure
    if (typeof result.materialPrice === 'undefined' || typeof result.laborPrice === 'undefined') {
      throw new Error(`Hiányzó mezők a válaszban: ${JSON.stringify(result)}`);
    }

    const materialPrice = Math.round((+result.materialPrice || 0) * 100) / 100;
    const laborPrice = Math.round((+result.laborPrice || 0) * 100) / 100;
    
    console.log(`[getAIPricing] Returning prices - Material: ${materialPrice}, Labor: ${laborPrice}`);
    
    return { materialPrice, laborPrice };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ismeretlen hiba';
    console.error('[getAIPricing] Error:', errorMessage);
    console.error('[getAIPricing] Error details:', e);
    return { materialPrice: 0, laborPrice: 0 };
  }
}
