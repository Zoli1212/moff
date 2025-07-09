export interface RequirementLine {
  id: string;
  text: string;
  isSectionHeader: boolean;
  sectionHeader?: string;
}

export function parseRequirementLines(description: string): RequirementLine[] {
  if (!description) return [];
  
  const lines = description.split('\n');
  let currentSection = '';
  
  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isSection = Boolean(trimmed.endsWith(':') || 
                           (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith(',') && 
                            (index === 0 || lines[index - 1].trim() === '')));
    
    if (isSection) {
      currentSection = trimmed;
    }
    
    return {
      id: `line-${index}-${Date.now()}`,
      text: line,
      isSectionHeader: isSection,
      sectionHeader: isSection ? undefined : currentSection
    };
  });
}

export function isLineDeletable(line: RequirementLine): boolean {
  if (!line || !line.text || !line.text.trim()) return false; // Don't allow deleting empty lines
  return true;
}
