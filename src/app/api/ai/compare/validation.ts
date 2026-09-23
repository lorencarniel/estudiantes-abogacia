export interface ComparisonDifference {
  aspect: string;
  concept_a_value: string;
  concept_b_value: string;
  source_a: string;
  source_b: string;
  source_section_a: string;
  source_section_b: string;
}

export interface ComparisonSimilarity {
  statement: string;
  source_fragment: string;
  source_section: string;
}

export interface Comparison {
  concept_a: string;
  concept_b: string;
  concept_a_supported: boolean;
  concept_b_supported: boolean;
  definition_a: string;
  definition_b: string;
  differences: ComparisonDifference[];
  similarities: ComparisonSimilarity[];
  articles: string;
  example: string;
  example_type: "source" | "didactic" | "none";
  warnings: string[];
}

export function validateComparisonSyntax(c: Comparison): boolean {
  if (!c.concept_a || c.concept_a.trim().length < 2) return false;
  if (!c.concept_b || c.concept_b.trim().length < 2) return false;
  if (!c.definition_a || c.definition_a.trim().length < 5) return false;
  if (!c.definition_b || c.definition_b.trim().length < 5) return false;
  if (typeof c.concept_a_supported !== "boolean") return false;
  if (typeof c.concept_b_supported !== "boolean") return false;
  if (!Array.isArray(c.differences)) return false;
  if (!Array.isArray(c.similarities)) return false;
  if (!Array.isArray(c.warnings)) return false;
  if (!["source", "didactic", "none"].includes(c.example_type)) return false;
  return true;
}

export function hasGenericSimilarity(sim: ComparisonSimilarity): boolean {
  const generic = [
    "buen funcionamiento",
    "ambos son importantes",
    "organización política",
    "adaptarse al contexto",
    "ambos buscan",
    "ambos permiten",
    "ambos contribuyen",
    "ambos tienen como objetivo",
    "son relevantes para",
    "juegan un papel",
  ];
  const lower = sim.statement.toLowerCase();
  return generic.some((g) => lower.includes(g));
}

export function hasUnsourcedDifference(diff: ComparisonDifference): boolean {
  return diff.source_a.trim().length < 10 || diff.source_b.trim().length < 10;
}

export function hasUnsourcedSimilarity(sim: ComparisonSimilarity): boolean {
  return sim.source_fragment.trim().length < 10;
}

export function hasCrossSectionContamination(
  diff: ComparisonDifference,
  conceptA: string,
  conceptB: string,
): boolean {
  const sectionA = diff.source_section_a.trim().toLowerCase();
  const sectionB = diff.source_section_b.trim().toLowerCase();

  if (!sectionA || !sectionB) return false;

  function sectionMatchesConcept(section: string, concept: string): boolean {
    const c = concept.trim().toLowerCase();
    if (section === c) return true;
    const sWords = section.split(/[\s,;:./()]+/).filter((w) => w.length > 3);
    const cWords = c.split(/[\s,;:./()]+/).filter((w) => w.length > 3);
    return cWords.some((cw) => sWords.some((sw) => sw === cw));
  }

  if (!sectionMatchesConcept(sectionA, conceptA)) return true;
  if (!sectionMatchesConcept(sectionB, conceptB)) return true;

  return false;
}

export function hasGenericDefinition(definition: string): boolean {
  const patterns = [
    /^es la rama del derecho que/i,
    /^es la rama que/i,
    /^es el conjunto de normas que/i,
    /^el pueblo ejerce el poder/i,
    /^el pueblo elige representantes/i,
    /^forma de gobierno en la que/i,
    /^sistema de gobierno donde/i,
    /^régimen político que/i,
    /^se refiere a la capacidad de/i,
    /^es aquella en la que/i,
    /^consiste en la posibilidad de/i,
  ];
  return patterns.some((p) => p.test(definition.trim()));
}

export function validateComparison(c: Comparison): {
  valid: boolean;
  filteredDifferences: ComparisonDifference[];
  filteredSimilarities: ComparisonSimilarity[];
  addedWarnings: string[];
} {
  const addedWarnings: string[] = [];

  if (hasGenericDefinition(c.definition_a)) {
    addedWarnings.push(`Definición de "${c.concept_a}" parece genérica (no proviene del material). Verificar.`);
  }
  if (hasGenericDefinition(c.definition_b)) {
    addedWarnings.push(`Definición de "${c.concept_b}" parece genérica (no proviene del material). Verificar.`);
  }

  const filteredDifferences = c.differences.filter((d) => {
    if (hasUnsourcedDifference(d)) {
      addedWarnings.push(`Diferencia "${d.aspect}" descartada por falta de respaldo textual.`);
      return false;
    }
    if (hasCrossSectionContamination(d, c.concept_a, c.concept_b)) {
      addedWarnings.push(`Diferencia "${d.aspect}" descartada: la fuente proviene de una sección sobre otro concepto.`);
      return false;
    }
    return true;
  });

  const filteredSimilarities = c.similarities.filter((s) => {
    if (hasGenericSimilarity(s)) {
      addedWarnings.push(`Semejanza genérica descartada: "${s.statement}"`);
      return false;
    }
    if (hasUnsourcedSimilarity(s)) {
      addedWarnings.push(`Semejanza descartada por falta de respaldo textual: "${s.statement}"`);
      return false;
    }
    return true;
  });

  if (!c.concept_a_supported) {
    addedWarnings.push(`El material no desarrolla suficientemente "${c.concept_a}". Comparación parcial.`);
  }
  if (!c.concept_b_supported) {
    addedWarnings.push(`El material no desarrolla suficientemente "${c.concept_b}". Comparación parcial.`);
  }

  const valid = c.concept_a_supported && c.concept_b_supported && filteredDifferences.length > 0;

  return { valid, filteredDifferences, filteredSimilarities, addedWarnings };
}
