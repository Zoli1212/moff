import * as fs from 'fs';
import * as path from 'path';

export interface OfferItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  materialUnitPrice: string;
  workTotal: string;
  materialTotal: string;
  totalPrice: string;
}

export interface ParsedOffer {
  title: string;
  location: string;
  items: OfferItem[];
  totalPrice: number;
  notes?: string[];
  offerSummary?: string;
}

export function parseOfferText(text: string): ParsedOffer {
  console.log("🔍 parseOfferText - Raw text before parsing:", text);
  
  // Save raw text to file for debugging
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `offer-raw-${timestamp}.txt`);
    fs.writeFileSync(logFile, `Raw Offer Text:\n\n${text}\n\n---\nTimestamp: ${new Date().toISOString()}`);
    console.log(`✅ Raw offer text saved to: ${logFile}`);
  } catch (error) {
    console.error("❌ Error saving raw offer text to file:", error);
  }

  const lines = text.split('\n').filter(line => line.trim() !== '');
  const items: OfferItem[] = [];
  const notes: string[] = [];

  // Extract offerSummary from text
  let offerSummary: string | undefined;
  const offerSummaryMatch = text.match(/offerSummary:\s*(.+?)(?:\n|$)/i);
  if (offerSummaryMatch) {
    offerSummary = offerSummaryMatch[1].trim();
  }

  // Extract title from the first line containing 'kerület' or fallback
  const titleLine = lines.find(line => line.includes('kerület')) || 'Ismeretlen cím';
  const title = titleLine.split('#').pop()?.trim() || 'Új ajánlat';

  // Extract location from title
  const location = title.split(',').slice(0, -1).join(',').trim();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip irrelevant lines (but keep "További anyagköltségek" section)
    if (!trimmed || trimmed.startsWith('Kedves') || 
        trimmed.includes('előzetes ajánlat') || trimmed.includes('Összesített')) {
      continue;
    }

    // Skip ** lines EXCEPT those containing "További anyagköltségek" or material costs
    if (trimmed.startsWith('**') && !trimmed.includes('További anyagköltségek') && !trimmed.includes('Anyagköltség')) {
      continue;
    }

    // Parse new detailed item lines with labor + material
    const itemMatch = trimmed.match(
      /^(.+?):\s*([\d\s,.]+)\s*(m²|m3|m³|fm|db|óra|nap|hét|hónap|kg|t|liter|pár|szett|csomag|cs|lap|m|mm|cm|szem|szál|zsák|üveg|doboz|flakon|tekercs|l)\s*×\s*([\d\s,.]+)\s*Ft\/\3\s*\(díj\)\s*\+\s*([\d\s,.]+)\s*Ft\/\3\s*\(anyag\)\s*=\s*([\d\s,.]+)\s*Ft\s*\(díj összesen\)\s*\+\s*([\d\s,.]+)\s*Ft\s*\(anyag összesen\)/i
    );

    if (itemMatch) {
      const [
        _, name, quantity, unit, unitPrice, materialUnitPrice, laborTotal, materialTotal
      ] = itemMatch;

      console.log(_)

      const workTotalNum = parseFloat((laborTotal ?? '').toString().trim().replace(/\s/g, '').replace(',', '.')) || 0;
      const materialTotalNum = parseFloat((materialTotal ?? '').toString().trim().replace(/\s/g, '').replace(',', '.')) || 0;
      const calculatedTotal = workTotalNum + materialTotalNum;
      
      // Clean up item name: remove "(egyedi tétel)" text
      let cleanedName = (name ?? '').toString().trim();
      cleanedName = cleanedName.replace(/\s*\(egyedi tétel\)\s*$/, '').trim();
      
      items.push({
        name: cleanedName,
        quantity: (quantity ?? '').toString().trim(),
        unit: (unit ?? '').toString().trim(),
        unitPrice: (unitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialUnitPrice: (materialUnitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        workTotal: (laborTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialTotal: (materialTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        totalPrice: calculatedTotal.toLocaleString('hu-HU') + ' Ft'
      });
      
    } else if (trimmed) {
      // Skip offerSummary lines - they're handled separately
      if (!trimmed.toLowerCase().startsWith("offersummary:")) {
        // Remove ** and # characters from lines
        const cleanedLine = trimmed.replace(/\*\*/g, '').replace(/^#\s*/, '');
        // Non-item lines go into notes
        notes.push(cleanedLine);
      }
    }
  }

  // Extract custom item names from notes and mark them in items
  const customItemNames = new Set<string>();
  notes.forEach(note => {
    const customMatch = note.match(/A következő tétel nem volt az adatbázisban:\s*'([^']+)\s*\(egyedi tétel\)'/i);
    if (customMatch) {
      customItemNames.add(customMatch[1].trim());
    }
  });

  // Mark custom items with ! at the end of their name
  const itemsWithMarking = items.map(item => {
    // Remove leading asterisk and "(egyedi tétel)" text for comparison
    let itemNameForComparison = item.name.replace(/^\*/, '').trim();
    itemNameForComparison = itemNameForComparison.replace(/\s*\(egyedi tétel\)\s*$/, '').trim();
    
    if (customItemNames.has(itemNameForComparison)) {
      // Also remove "(egyedi tétel)" from the actual name and add !
      const cleanedName = item.name.replace(/\s*\(egyedi tétel\)\s*$/, '').trim() + '!';
      return {
        ...item,
        name: cleanedName
      };
    }
    return item;
  });

  // Calculate total price (labor + material)
  const totalPrice = itemsWithMarking.reduce((sum, item) => {
    const work = parseFloat(item.workTotal.replace(/\s/g, '').replace(',', '.'));
    const material = parseFloat(item.materialTotal.replace(/\s/g, '').replace(',', '.'));
    return sum + (isNaN(work) ? 0 : work) + (isNaN(material) ? 0 : material);
  }, 0);

  const result = {
    title,
    location,
    items: itemsWithMarking,
    totalPrice,
    notes: notes.length > 0 ? notes : undefined,
    offerSummary
  };

  // Save parsed result to file for debugging
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `offer-parsed-${timestamp}.json`);
    fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
    console.log(`✅ Parsed offer result saved to: ${logFile}`);
  } catch (error) {
    console.error("❌ Error saving parsed offer result to file:", error);
  }

  return result;
}


export function formatOfferForSave(parsed: ParsedOffer) {
  return {
    title: parsed.title,
    location: parsed.location,
    totalPrice: parsed.totalPrice,
    items: parsed.items.map(item => ({
      ...item,
      unitPrice: item.unitPrice,
      materialUnitPrice: item.materialUnitPrice,
      workTotal: item.workTotal,
      materialTotal: item.materialTotal,
      totalPrice: item.totalPrice
    })),
    notes: parsed.notes,
    offerSummary: parsed.offerSummary
  };
}
