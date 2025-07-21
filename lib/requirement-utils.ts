export interface RequirementLine {
  id: string;
  text: string;
  isSectionHeader: boolean;
  sectionHeader?: string;
  isDeletable?: boolean;
  isBlock?: boolean;
}

export function parseRequirementLines(description: string): RequirementLine[] {
  if (!description) return [];
  
  // Helper function to remove accents for better matching
  
  let currentSection = "";
  let inRequirements = false;
  const lines: RequirementLine[] = [];
  
  // First, split by double newlines to preserve the original structure
  const doubleNewlineSections = description.split(/\n\s*\n/);
  
  // Process each section that was separated by double newlines
  doubleNewlineSections.forEach((section, sectionIndex) => {
    const trimmed = section.trim();
    if (!trimmed) return; // Skip empty sections
    
    // Check if this is a section header (ends with colon)
    const isSection = trimmed.endsWith(":");
    
    if (isSection) {
      currentSection = trimmed;
      inRequirements = (trimmed === "Felújítási igények:" || 
                       trimmed.toLowerCase().includes("igények") ||
                       trimmed.toLowerCase().includes("munkálatok"));
    }
    
    // Split the section into individual lines
    const sectionLines = section.split('\n').map(line => line.trim()).filter(line => line);
    
    sectionLines.forEach((line, lineIndex) => {
      const isLineASection = line.endsWith(":");
      const isAfterDoubleNewline = lineIndex === 0 && sectionIndex > 0;
      
      // If it's a section header, update the current section
      if (isLineASection) {
        currentSection = line;
        inRequirements = (line === "Felújítási igények:" || 
                         line.toLowerCase().includes("igények") ||
                         line.toLowerCase().includes("munkálatok"));
      }
      
      // A line is always deletable if it's after a double newline and not a section header
      const isAfterDoubleNewlineDeletable = isAfterDoubleNewline && !isLineASection;
      
      // A line is also deletable if it's in the requirements section and not a section header
      const isInRequirementsDeletable = inRequirements && !isLineASection;
      
      // Exclude lines that match certain patterns
      const normalizedLine = line.toLowerCase();
      const isExcluded = [
        'tárgy:', 'targy:', 'tárgy :', 'targy :',
        'kedves', 'tisztelettel', 'üdvözlettel', 'köszönettel',
        'elérhetőség', 'elerhetoseg', 'elérhető', 'elerheto',
        'díj', 'ar', 'ár', 'fizetés', 'fizetes', 'fizetési', 'fizetesi',
        'összeg', 'osszeg', 'árképzés', 'arkepzes', 'árkalkuláció', 'arkalkulacio',
        'határidő', 'hatarido', 'időpont', 'idopont', 'dátum', 'datum'
      ].some(term => normalizedLine.includes(term.toLowerCase()));
      
      // Also exclude lines that look like headers or very short lines
      // But only apply these checks if it's not after a double newline
      const looksLikeHeader = !isAfterDoubleNewline && (
        isLineASection || 
        /^[A-ZÁÉÍÓÖŐÚÜŰ][^.!?]*[.:]$/.test(line) ||
        line.length < 10
      );
      
      // A line is deletable if:
      // 1. It's after a double newline (always deletable), OR
      // 2. It's in requirements section and passes all other checks
      const shouldBeDeletable = isAfterDoubleNewlineDeletable || 
                              (isInRequirementsDeletable && !isExcluded && !looksLikeHeader && line.length >= 10);
      
      // Add the line with appropriate metadata
      lines.push({
        id: `line-${sectionIndex}-${lineIndex}-${Date.now()}`,
        text: line,
        isSectionHeader: isLineASection,
        sectionHeader: isLineASection ? undefined : currentSection,
        isDeletable: shouldBeDeletable,
        isBlock: isAfterDoubleNewline && !isLineASection
      });
    });
  });
  
  return lines;
  return lines;
}

export function isLineDeletable(line: RequirementLine): boolean {
  // If isDeletable is explicitly set, use that value
  if (typeof line.isDeletable === 'boolean') return line.isDeletable;
  
  // Basic validation
  if (!line?.text?.trim()) return false;
  
  const text = line.text.trim();
  const len = text.length;
  
  // Non-deletable patterns
  const nonDeletablePatterns = [
    /^\s*[!?].*$/, // Lines starting with ! or ?
    /^\s*\d+[.)]\s+.*$/, // Numbered lists (1. 2. etc.)
    /^\s*[-*]\s+.*$/, // Bullet points
    /^\s*[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+:.*$/, // Lines that look like headers (e.g., "Név: ")
    /^\s*https?:\/\//, // URLs
    /^\s*[0-9.,\s]+\s*(?:Ft|HUF|€|\$|EUR|USD)\s*$/, // Prices
  ];
  
  // Check against non-deletable patterns
  if (nonDeletablePatterns.some(pattern => pattern.test(text))) {
    return false;
  }
  
  // Length constraints
  if (len < 20 || len > 500) return false;
  
  // Check if line contains common non-deletable phrases
  const nonDeletablePhrases = [
    'tárgy:', 'targy:', 'tárgy :', 'targy :',
    'kedves', 'tisztelettel', 'üdvözlettel', 'köszönettel', 'Tisztelt',
    'elérhetőség', 'elerhetoseg', 'elérhető', 'elerheto',
    'díj', 'ar', 'ár', 'fizetés', 'fizetes', 'fizetési', 'fizetesi',
    'összeg', 'osszeg', 'árképzés', 'arkepzes', 'árkalkuláció', 'arkalkulacio',
    'határidő', 'hatarido', 'határidő:', 'hatarido:', 'határidő :', 'hatarido :',
    'időpont', 'idopont', 'dátum', 'datum', 'nap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek',
    'hétvége', 'hétvégén', 'hétvégére', 'hétvégétől', 'hétfőtől', 'keddtől', 'szerdától', 'csütörtöktől', 'péntektől',
    'hónap', 'honap', 'hét', 'het', 'nap', 'óra', 'ora', 'perc', 'másodperc', 'masodperc',
    'kész', 'kesz', 'készült', 'keszult', 'készítve', 'keszitve', 'készítés', 'keszites', 'készítés', 'keszites',
    'állapot', 'allapot', 'státusz', 'statusz', 'státusz', 'statusz', 'állapot', 'allapot',
    'megjegyzés', 'megjegyzes', 'megjegyzés', 'megjegyzes', 'megjegyzés', 'megjegyzes',
    'egyéb', 'egyeb', 'további', 'tovabbi', 'egyéb', 'egyeb', 'további', 'tovabbi',
    'leírás', 'leiras', 'leírás', 'leiras', 'leírás', 'leiras', 'leírás', 'leiras',
    'cím', 'cim', 'cím', 'cim', 'cím', 'cim', 'cím', 'cim',
    'név', 'nev', 'név', 'nev', 'név', 'nev', 'név', 'nev',
    'telefonszám', 'telefonszam', 'telefon', 'telefonszám', 'telefonszam', 'telefon',
    'email', 'e-mail', 'e-mail cím', 'email cim', 'e-mail cím', 'email cim',
    'cég', 'ceg', 'cég', 'ceg', 'cég', 'ceg', 'cég', 'ceg',
    'adószám', 'adoszam', 'adószám', 'adoszam', 'adószám', 'adoszam', 'adószám', 'adoszam',
    'bankszámlaszám', 'bankszamlaszam', 'bankszámlaszám', 'bankszamlaszam', 'bankszámlaszám', 'bankszamlaszam',
    'számlázási cím', 'szamlazasi cim', 'számlázási cím', 'szamlazasi cim', 'számlázási cím', 'szamlazasi cim',
    'szállítási cím', 'szallitasi cim', 'szállítási cím', 'szallitasi cim', 'szállítási cím', 'szallitasi cim',
    'számla', 'szamla', 'számla', 'szamla', 'számla', 'szamla', 'számla', 'szamla',
    'fizetés', 'fizetes', 'fizetés', 'fizetes', 'fizetés', 'fizetes', 'fizetés', 'fizetes',
    'fizetési mód', 'fizetesi mod', 'fizetési mód', 'fizetesi mod', 'fizetési mód', 'fizetesi mod',
    'átutalás', 'atutalas', 'átutalás', 'atutalas', 'átutalás', 'atutalas', 'átutalás', 'atutalas',
    'készpénz', 'keszpenz', 'készpénz', 'keszpenz', 'készpénz', 'keszpenz', 'készpénz', 'keszpenz',
    'kártya', 'kartya', 'kártya', 'kartya', 'kártya', 'kartya', 'kártya', 'kartya',
    'átvétel', 'atvetel', 'átvétel', 'atvetel', 'átvétel', 'atvetel', 'átvétel', 'atvetel',
    'szállítás', 'szallitas', 'szállítás', 'szallitas', 'szállítás', 'szallitas', 'szállítás', 'szallitas',
    'szállítási idő', 'szallitasi ido', 'szállítási idő', 'szallitasi ido', 'szállítási idő', 'szallitasi ido',
    'szállítási díj', 'szallitasi dij', 'szállítási díj', 'szallitasi dij', 'szállítási díj', 'szallitasi dij',
    'ingyenes szállítás', 'ingyenes szallitas', 'ingyenes szállítás', 'ingyenes szallitas', 'ingyenes szállítás', 'ingyenes szallitas',
    'garancia', 'garancia', 'garancia', 'garancia', 'garancia', 'garancia', 'garancia', 'garancia',
    'jótállás', 'jotallas', 'jótállás', 'jotallas', 'jótállás', 'jotallas', 'jótállás', 'jotallas',
    'visszaküldés', 'visszakuldes', 'visszaküldés', 'visszakuldes', 'visszaküldés', 'visszakuldes', 'visszaküldés', 'visszakuldes',
    'visszavétel', 'visszavetel', 'visszavétel', 'visszavetel', 'visszavétel', 'visszavetel', 'visszavétel', 'visszavetel',
    'visszavásárlás', 'visszavasarolas', 'visszavásárlás', 'visszavasarolas', 'visszavásárlás', 'visszavasarolas', 'visszavásárlás', 'visszavasarolas',
    'visszavásárlási ár', 'visszavasarolasi ar', 'visszavásárlási ár', 'visszavasarolasi ar', 'visszavásárlási ár', 'visszavasarolasi ar',
    'visszavásárlási idő', 'visszavasarolasi ido', 'visszavásárlási idő', 'visszavasarolasi ido', 'visszavásárlási idő', 'visszavasarolasi ido',
    'visszavásárlási feltételek', 'visszavasarolasi feltetelek', 'visszavásárlási feltételek', 'visszavasarolasi feltetelek', 'visszavásárlási feltételek', 'visszavasarolasi feltetelek',
    'visszavásárlási szerződés', 'visszavasarolasi szerzodes', 'visszavásárlási szerződés', 'visszavasarolasi szerzodes', 'visszavásárlási szerződés', 'visszavasarolasi szerzodes',
    'visszavásárlási ajánlat', 'visszavasarolasi ajanlat', 'visszavásárlási ajánlat', 'visszavasarolasi ajanlat', 'visszavásárlási ajánlat', 'visszavasarolasi ajanlat',
    'visszavásárlási kérelem', 'visszavasarolasi kerelme', 'visszavásárlási kérelem', 'visszavasarolasi kerelme', 'visszavásárlási kérelem', 'visszavasarolasi kerelme',
    'visszavásárlási igénylés', 'visszavasarolasi igenyles', 'visszavásárlási igénylés', 'visszavasarolasi igenyles', 'visszavásárlási igénylés', 'visszavasarolasi igenyles',
    'visszavásárlási nyilatkozat', 'visszavasarolasi nyilatkozat', 'visszavásárlási nyilatkozat', 'visszavasarolasi nyilatkozat', 'visszavásárlási nyilatkozat', 'visszavasarolasi nyilatkozat',
    'visszavásárlási igazolás', 'visszavasarolasi igazolas', 'visszavásárlási igazolás', 'visszavasarolasi igazolas', 'visszavásárlási igazolás', 'visszavasarolasi igazolas',
    'visszavásárlási bizonylat', 'visszavasarolasi bizonylat', 'visszavásárlási bizonylat', 'visszavasarolasi bizonylat', 'visszavásárlási bizonylat', 'visszavasarolasi bizonylat',
    'visszavásárlási nyugta', 'visszavasarolasi nyugta', 'visszavásárlási nyugta', 'visszavasarolasi nyugta', 'visszavásárlási nyugta', 'visszavasarolasi nyugta',
    'visszavásárlási számla', 'visszavasarolasi szamla', 'visszavásárlási számla', 'visszavasarolasi szamla', 'visszavásárlási számla', 'visszavasarolasi szamla',
    'visszavásárlási díj', 'visszavasarolasi dij', 'visszavásárlási díj', 'visszavasarolasi dij', 'visszavásárlási díj', 'visszavasarolasi dij',
    'visszavásárlási költség', 'visszavasarolasi koltseg', 'visszavásárlási költség', 'visszavasarolasi koltseg', 'visszavásárlási költség', 'visszavasarolasi koltseg',
    'visszavásárlási díjmentesség', 'visszavasarolasi dijmentesseg', 'visszavásárlási díjmentesség', 'visszavasarolasi dijmentesseg', 'visszavásárlási díjmentesség', 'visszavasarolasi dijmentesseg',
    'visszavásárlási díjmentes', 'visszavasarolasi dijmentes', 'visszavásárlási díjmentes', 'visszavasarolasi dijmentes', 'visszavásárlási díjmentes', 'visszavasarolasi dijmentes',
    'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites',
    'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto',
    'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites',
    'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto',
    'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites', 'visszavásárlási díjmentesítés', 'visszavasarolasi dijmentesites',
    'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto', 'visszavásárlási díjmentesíthető', 'visszavasarolasi dijmentesitheto'
  ];
  
  // Check if line contains any non-deletable phrases (case insensitive)
  const lowerText = text.toLowerCase();
  if (nonDeletablePhrases.some(phrase => lowerText.includes(phrase))) {
    return false;
  }
  
  // If all checks pass, the line is deletable
  return true;
}
