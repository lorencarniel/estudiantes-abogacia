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
  mentioned_criteria: string[];
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
  if (!Array.isArray(c.mentioned_criteria)) return false;
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

const META_STATEMENT_PATTERNS = [
  /\bno se menciona\b/i,
  /\bno aparece\b/i,
  /\bno se desarrolla\b/i,
  /\bel material no\b/i,
  /\bla fuente no\b/i,
  /\bno se hace referencia\b/i,
  /\bno se establece\b/i,
  /\bno se especifica\b/i,
];

export function hasFabricatedSource(source: string): boolean {
  return META_STATEMENT_PATTERNS.some((p) => p.test(source));
}

export function hasUnsourcedDifference(diff: ComparisonDifference): boolean {
  if (diff.source_a.trim().length < 10 || diff.source_b.trim().length < 10) return true;
  if (hasFabricatedSource(diff.source_a) || hasFabricatedSource(diff.source_b)) return true;
  return false;
}

export function hasUnsourcedSimilarity(sim: ComparisonSimilarity): boolean {
  return sim.source_fragment.trim().length < 10;
}

const INVERSE_PATTERNS = [
  /\bno\s+(tienen?|poseen?|existen?|hay|cuenta[n]?\s+con|gozan?|puede[n]?)\b/i,
  /\bcarece[n]?\s+de\b/i,
  /\bausencia\s+de\b/i,
  /\bsin\s+(derecho|facultad|poder|capacidad|órganos?)\b/i,
  /\bmenor\s+(grado|nivel|medida)\b/i,
];

export function looksLikeInverseInference(
  valueA: string,
  valueB: string,
  sourceA: string,
  sourceB: string,
): boolean {
  const valA = valueA.trim().toLowerCase();
  const valB = valueB.trim().toLowerCase();
  const binaryValues = ["sí", "si", "no"];
  if (binaryValues.includes(valA) || binaryValues.includes(valB)) {
    return true;
  }
  const checkSide = (value: string, source: string): boolean => {
    if (source.trim().length < 10) return false;
    const valueLower = value.toLowerCase();
    const sourceLower = source.toLowerCase();
    if (INVERSE_PATTERNS.some((p) => p.test(valueLower)) && !INVERSE_PATTERNS.some((p) => p.test(sourceLower))) {
      return true;
    }
    return false;
  };
  return checkSide(valueA, sourceA) || checkSide(valueB, sourceB);
}

export function hasDefinitionContamination(
  definitionA: string,
  definitionB: string,
): boolean {
  const a = definitionA.trim().toLowerCase();
  const b = definitionB.trim().toLowerCase();
  if (a.length < 10 || b.length < 10) return false;
  if (a === b) return true;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (longer.includes(shorter) && shorter.length > 20) return true;
  return false;
}

function wordsShareRoot(a: string, b: string): boolean {
  const minLen = Math.min(a.length, b.length);
  if (minLen < 5) return false;
  const rootLen = Math.min(minLen, 6);
  return a.substring(0, rootLen) === b.substring(0, rootLen);
}

function sectionMatchesConcept(section: string, concept: string): boolean {
  const c = concept.trim().toLowerCase();
  const s = section.trim().toLowerCase();
  if (s === c) return true;

  const sWords = s.split(/[\s,;:./()]+/).filter((w) => w.length > 3);
  const cWords = c.split(/[\s,;:./()]+/).filter((w) => w.length > 3);

  if (cWords.some((cw) => sWords.some((sw) => sw === cw || wordsShareRoot(sw, cw)))) return true;
  return false;
}

export function hasCrossSectionContamination(
  diff: ComparisonDifference,
  conceptA: string,
  conceptB: string,
): boolean {
  const sectionA = diff.source_section_a.trim().toLowerCase();
  const sectionB = diff.source_section_b.trim().toLowerCase();

  if (!sectionA || !sectionB) return false;

  const aMatchesA = sectionMatchesConcept(sectionA, conceptA);
  const aMatchesB = sectionMatchesConcept(sectionA, conceptB);
  const bMatchesA = sectionMatchesConcept(sectionB, conceptA);
  const bMatchesB = sectionMatchesConcept(sectionB, conceptB);

  if (aMatchesB && !aMatchesA) return true;
  if (bMatchesA && !bMatchesB) return true;

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

export interface ValidationResult {
  valid: boolean;
  approvedDifferences: ComparisonDifference[];
  reclassifiedCriteria: string[];
  filteredSimilarities: ComparisonSimilarity[];
  warnings: string[];
}

export function validateComparison(c: Comparison): ValidationResult {
  const warnings: string[] = [];
  const reclassifiedCriteria: string[] = [];

  if (hasGenericDefinition(c.definition_a)) {
    warnings.push(`Definición de "${c.concept_a}" parece genérica (no proviene del material). Verificar.`);
  }
  if (hasGenericDefinition(c.definition_b)) {
    warnings.push(`Definición de "${c.concept_b}" parece genérica (no proviene del material). Verificar.`);
  }

  if (hasDefinitionContamination(c.definition_a, c.definition_b)) {
    warnings.push("Las definiciones de ambos conceptos son idénticas o una contiene a la otra. Posible contaminación.");
  }

  const approvedDifferences: ComparisonDifference[] = [];

  for (const d of c.differences) {
    if (hasUnsourcedDifference(d)) {
      reclassifiedCriteria.push(d.aspect);
      continue;
    }
    if (looksLikeInverseInference(d.concept_a_value, d.concept_b_value, d.source_a, d.source_b)) {
      reclassifiedCriteria.push(d.aspect);
      continue;
    }
    if (hasCrossSectionContamination(d, c.concept_a, c.concept_b)) {
      reclassifiedCriteria.push(d.aspect);
      continue;
    }
    approvedDifferences.push(d);
  }

  const filteredSimilarities = c.similarities.filter((s) => {
    if (hasGenericSimilarity(s)) return false;
    if (hasUnsourcedSimilarity(s)) return false;
    return true;
  });

  if (!c.concept_a_supported) {
    warnings.push(`El material no desarrolla suficientemente "${c.concept_a}". Comparación parcial.`);
  }
  if (!c.concept_b_supported) {
    warnings.push(`El material no desarrolla suficientemente "${c.concept_b}". Comparación parcial.`);
  }

  const valid = c.concept_a_supported && c.concept_b_supported && approvedDifferences.length > 0;

  return { valid, approvedDifferences, reclassifiedCriteria, filteredSimilarities, warnings };
}
