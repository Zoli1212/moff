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
}

export function parseOfferText(text: string): ParsedOffer {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const items: OfferItem[] = [];
  const notes: string[] = [];

  // Extract title from the first line containing 'kerület' or fallback
  const titleLine = lines.find(line => line.includes('kerület')) || 'Ismeretlen cím';
  const title = titleLine.split('#').pop()?.trim() || 'Új ajánlat';

  // Extract location from title
  const location = title.split(',').slice(0, -1).join(',').trim();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip irrelevant lines
    if (!trimmed || trimmed.startsWith('**') || trimmed.startsWith('Kedves') || 
        trimmed.includes('előzetes ajánlat') || trimmed.includes('Összesített')) {
      continue;
    }

    // Parse new detailed item lines with labor + material
    const itemMatch = trimmed.match(
      /^(.+?):\s*([\d\s,.]+)\s*(m²|fm|db)\s*×\s*([\d\s,.]+)\s*Ft\/\3\s*\(díj\)\s*\+\s*([\d\s,.]+)\s*Ft\/\3\s*\(anyag\)\s*=\s*([\d\s,.]+)\s*Ft\s*\(díj összesen\)\s*\+\s*([\d\s,.]+)\s*Ft\s*\(anyag összesen\)/i
    );

    if (itemMatch) {
      const [
        _, name, quantity, unit, unitPrice, materialUnitPrice, laborTotal, materialTotal, totalPrice
      ] = itemMatch;

      const workTotalNum = parseFloat((laborTotal ?? '').toString().trim().replace(/\s/g, '').replace(',', '.')) || 0;
      const materialTotalNum = parseFloat((materialTotal ?? '').toString().trim().replace(/\s/g, '').replace(',', '.')) || 0;
      const calculatedTotal = workTotalNum + materialTotalNum;
      
      items.push({
        name: (name ?? '').toString().trim(),
        quantity: (quantity ?? '').toString().trim(),
        unit: (unit ?? '').toString().trim(),
        unitPrice: (unitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialUnitPrice: (materialUnitPrice ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        workTotal: (laborTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        materialTotal: (materialTotal ?? '').toString().trim().replace(/\s/g, '') + ' Ft',
        totalPrice: calculatedTotal.toLocaleString('hu-HU') + ' Ft'
      });
      
    } else if (trimmed) {
      // Non-item lines go into notes
      notes.push(trimmed);
    }
  }

  // Calculate total price (labor + material)
  const totalPrice = items.reduce((sum, item) => {
    const work = parseFloat(item.workTotal.replace(/\s/g, '').replace(',', '.'));
    const material = parseFloat(item.materialTotal.replace(/\s/g, '').replace(',', '.'));
    return sum + (isNaN(work) ? 0 : work) + (isNaN(material) ? 0 : material);
  }, 0);

  return {
    title,
    location,
    items,
    totalPrice,
    notes: notes.length > 0 ? notes : undefined
  };
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
    notes: parsed.notes
  };
}
