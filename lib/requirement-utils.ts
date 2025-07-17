export interface RequirementLine {
  id: string;
  text: string;
  isSectionHeader: boolean;
  sectionHeader?: string;
  isDeletable?: boolean;
}

export function parseRequirementLines(description: string): RequirementLine[] {
  if (!description) return [];
  let currentSection = "";
  let inRequirements = false;
  const lines: RequirementLine[] = [];
  const blocks = description.split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    const isSection = trimmed.endsWith(":");
    // Section header detektálás
    if (isSection) {
      currentSection = trimmed;
      inRequirements = (trimmed === "Felújítási igények:");
    }
    // Meta blokkok kizárása
    function removeAccents(str: string): string {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    const normalized = removeAccents(trimmed.toLowerCase());
    const metaPatterns = [
      'udvozlettel',
      'tisztelettel',
      'info@',
      '+36',
      'ugyvezeto',
      'optisolve',
      'kft.',
      'dr.',
      'ajanlatkeresi szempont',
      'anyag- es munkadij',
      'osszeg',
      'kivitelezesi ido',
      'munkakezdes',
      'helyszini egyeztetes',
      'Helyszíni',
      'egyeztetes',
      'idopont',
      'nyitottak vagyunk',
      'rugalmas',
      'koszonettel',
      'ugyvezeto',
      'targy'
    ];
    const normalizedMetaPatterns = metaPatterns.map(m => removeAccents(m.toLowerCase()));
    const isMeta = normalizedMetaPatterns.some(meta => normalized.includes(meta));

    // A végén lévő blokkok törölhetők, ha nem section header és nem meta
    const isAtEnd = index > 0 && !inRequirements && !isSection && index >= blocks.length - 6;

    lines.push({
      id: `line-${index}-${Date.now()}`,
      text: block,
      isSectionHeader: isSection,
      sectionHeader: isSection ? undefined : currentSection,
      isDeletable:
        (
          (inRequirements && !isSection && !isMeta) ||
          (isAtEnd && !isMeta)
        ) &&
        !block.includes("!") &&
        block.trim().length >= 8 &&
        block.trim().length <= 200,
    });
  });
  return lines;
}

export function isLineDeletable(line: RequirementLine): boolean {
  if (typeof line.isDeletable === 'boolean') return line.isDeletable;
  if (!line || !line.text || !line.text.trim()) return false;
  const len = line.text.trim().length;
  if (line.text.includes('!')) return false;
  return len >= 20 && len <= 200;
}
