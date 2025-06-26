export interface OfferItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
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
  
  // Extract title from the first line after the greeting
  const titleLine = lines.find(line => line.includes('kerület')) || 'Ismeretlen cím';
  const title = titleLine.split('#').pop()?.trim() || 'Új ajánlat';
  
  // Extract location from title
  const location = title.split(',').slice(0, -1).join(',').trim();
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and section headers
    if (!trimmed || trimmed.startsWith('**') || trimmed.startsWith('Kedves') || 
        trimmed.includes('előzetes ajánlat') || trimmed.includes('Összesített')) {
      continue;
    }
    
    // Parse item lines with the format: "Description: quantity unit × price/unit = totalPrice Ft"
    const itemMatch = trimmed.match(/^(.+?):\s*([\d\s,.]*)\s*(m²|fm|db|db)\s*×\s*([\d\s,.]*)\s*Ft\/[^=]*=\s*([\d\s,.]*)\s*Ft/i);
    
    if (itemMatch) {
      const [_, name, quantity, unit, unitPrice, totalPrice] = itemMatch;
      console.log(_)
      items.push({
        name: name.trim(),
        quantity: quantity.trim(),
        unit: unit.trim(),
        unitPrice: unitPrice.trim().replace(/\s/g, '') + ' Ft',
        totalPrice: totalPrice.trim().replace(/\s/g, '') + ' Ft'
      });
    } else if (trimmed) {
      // If it's not an item line, treat it as a note
      notes.push(trimmed);
    }
  }
  
  // Calculate total price
  const totalPrice = items.reduce((sum, item) => {
    const price = parseFloat(item.totalPrice.replace(/\s/g, '').replace(',', '.'));
    return sum + (isNaN(price) ? 0 : price);
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
      totalPrice: item.totalPrice
    })),
    notes: parsed.notes
  };
}
