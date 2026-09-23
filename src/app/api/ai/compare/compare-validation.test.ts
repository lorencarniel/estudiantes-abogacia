import { describe, it, expect } from "vitest";
import {
  validateComparisonSyntax,
  validateComparison,
  hasGenericSimilarity,
  hasUnsourcedDifference,
  hasUnsourcedSimilarity,
  hasCrossSectionContamination,
  hasGenericDefinition,
  looksLikeInverseInference,
  hasFabricatedSource,
  type Comparison,
  type ComparisonDifference,
  type ComparisonSimilarity,
} from "./validation";

function makeComparison(overrides: Partial<Comparison> = {}): Comparison {
  return {
    concept_a: "Federación",
    concept_b: "Confederación",
    concept_a_supported: true,
    concept_b_supported: true,
    definition_a: "Unión de Estados con constitución suprema y autonomía de las unidades.",
    definition_b: "Unión de Estados soberanos mediante un pacto.",
    differences: [
      {
        aspect: "Base jurídica",
        concept_a_value: "Constitución",
        concept_b_value: "Pacto",
        source_a: "La federación se basa en una constitución como norma suprema",
        source_b: "La confederación se origina en un pacto entre Estados soberanos",
        source_section_a: "Federación",
        source_section_b: "Confederación",
      },
    ],
    mentioned_criteria: [],
    similarities: [
      {
        statement: "Ambas son formas de organización estatal compuesta.",
        source_fragment: "Tanto la federación como la confederación son formas de Estado compuesto",
        source_section: "Formas de Estado",
      },
    ],
    articles: "Art. 1 CN",
    example: "Argentina como ejemplo de federación.",
    example_type: "source",
    warnings: [],
    ...overrides,
  };
}

function makeDifference(overrides: Partial<ComparisonDifference> = {}): ComparisonDifference {
  return {
    aspect: "Base jurídica",
    concept_a_value: "Constitución",
    concept_b_value: "Pacto",
    source_a: "La federación se basa en una constitución como norma suprema",
    source_b: "La confederación se origina en un pacto entre Estados soberanos",
    source_section_a: "Federación",
    source_section_b: "Confederación",
    ...overrides,
  };
}

function makeSimilarity(overrides: Partial<ComparisonSimilarity> = {}): ComparisonSimilarity {
  return {
    statement: "Ambas son formas de organización estatal compuesta.",
    source_fragment: "Tanto la federación como la confederación son formas de Estado compuesto",
    source_section: "Formas de Estado",
    ...overrides,
  };
}

// ── Test 1: Definición inventada / genérica del LLM ──
describe("definición inventada", () => {
  it("detecta concepto no soportado por la fuente", () => {
    const comp = makeComparison({ concept_b_supported: false });
    const result = validateComparison(comp);
    expect(result.addedWarnings.some((w) => w.includes("no desarrolla suficientemente"))).toBe(true);
  });

  it("detecta definición genérica del LLM", () => {
    expect(hasGenericDefinition("Es la rama del derecho que regula las relaciones entre Estados")).toBe(true);
    expect(hasGenericDefinition("El pueblo ejerce el poder directamente sin representantes")).toBe(true);
    expect(hasGenericDefinition("El pueblo elige representantes para ejercer el poder")).toBe(true);
    expect(hasGenericDefinition("Forma de gobierno en la que los ciudadanos participan")).toBe(true);
  });

  it("acepta definición textual del material", () => {
    expect(hasGenericDefinition("Unión de Estados con constitución suprema y autonomía")).toBe(false);
    expect(hasGenericDefinition("El material menciona este concepto pero no proporciona una definición.")).toBe(false);
  });

  it("agrega warning cuando detecta definición genérica", () => {
    const comp = makeComparison({
      definition_a: "Es la rama del derecho que estudia la organización provincial",
    });
    const result = validateComparison(comp);
    expect(result.addedWarnings.some((w) => w.includes("genérica"))).toBe(true);
  });
});

// ── Test 2: Diferencia sin respaldo ──
describe("diferencia sin respaldo", () => {
  it("detecta diferencia sin source_a", () => {
    expect(hasUnsourcedDifference(makeDifference({ source_a: "" }))).toBe(true);
  });

  it("detecta diferencia sin source_b", () => {
    expect(hasUnsourcedDifference(makeDifference({ source_b: "corto" }))).toBe(true);
  });

  it("acepta diferencia con ambas fuentes", () => {
    expect(hasUnsourcedDifference(makeDifference())).toBe(false);
  });

  it("filtra diferencias sin respaldo de la comparación", () => {
    const comp = makeComparison({
      differences: [
        makeDifference(),
        makeDifference({ aspect: "Soberanía", source_a: "", source_b: "" }),
      ],
    });
    const result = validateComparison(comp);
    expect(result.filteredDifferences).toHaveLength(1);
    expect(result.addedWarnings.some((w) => w.includes("Soberanía"))).toBe(true);
  });
});

// ── Test 3: Semejanza genérica inventada ──
describe("semejanza genérica", () => {
  it("detecta 'ambos buscan el buen funcionamiento'", () => {
    expect(hasGenericSimilarity(makeSimilarity({
      statement: "Ambos buscan el buen funcionamiento del Estado.",
    }))).toBe(true);
  });

  it("detecta 'ambos son importantes para la organización política'", () => {
    expect(hasGenericSimilarity(makeSimilarity({
      statement: "Ambos son importantes para la organización política.",
    }))).toBe(true);
  });

  it("detecta 'ambos permiten adaptarse al contexto'", () => {
    expect(hasGenericSimilarity(makeSimilarity({
      statement: "Ambos permiten adaptarse al contexto actual.",
    }))).toBe(true);
  });

  it("acepta semejanza concreta", () => {
    expect(hasGenericSimilarity(makeSimilarity())).toBe(false);
  });

  it("filtra semejanzas genéricas de la comparación", () => {
    const comp = makeComparison({
      similarities: [
        makeSimilarity(),
        makeSimilarity({
          statement: "Ambos buscan el buen funcionamiento del Estado.",
          source_fragment: "",
        }),
      ],
    });
    const result = validateComparison(comp);
    expect(result.filteredSimilarities).toHaveLength(1);
  });
});

// ── Test 4: Artículo no respaldado ──
describe("normativa no respaldada", () => {
  it("acepta normativa vacía sin error", () => {
    const comp = makeComparison({ articles: "" });
    expect(comp.articles).toBe("");
  });
});

// ── Test 5: Ejemplo externo sin etiquetar ──
describe("ejemplo sin etiquetar", () => {
  it("verifica que example_type distingue fuente de generado", () => {
    expect(makeComparison({ example_type: "source" }).example_type).toBe("source");
    expect(makeComparison({ example_type: "didactic" }).example_type).toBe("didactic");
    expect(makeComparison({ example_type: "none", example: "" }).example_type).toBe("none");
  });

  it("rechaza example_type inválido", () => {
    expect(validateComparisonSyntax(makeComparison({ example_type: "invalid" as any }))).toBe(false);
  });
});

// ── Test 6: Comparación con concepto insuficientemente documentado ──
describe("concepto insuficientemente documentado", () => {
  it("marca como inválida comparación donde ambos no están soportados", () => {
    const comp = makeComparison({
      concept_a_supported: false,
      concept_b_supported: false,
    });
    const result = validateComparison(comp);
    expect(result.valid).toBe(false);
    expect(result.addedWarnings.filter((w) => w.includes("no desarrolla suficientemente"))).toHaveLength(2);
  });
});

// ── Test 7: Contaminación cross-sección (caso real: Estados regionales → Confederación) ──
describe("contaminación cross-sección", () => {
  it("no marca contaminación cuando las secciones coinciden con los conceptos", () => {
    expect(hasCrossSectionContamination(makeDifference(), "Federación", "Confederación")).toBe(false);
  });

  it("no marca contaminación con nombres derivados (Estado Federal → Federación)", () => {
    const diff = makeDifference({
      source_section_a: "Estado Federal",
      source_section_b: "Confederación de Estados",
    });
    expect(hasCrossSectionContamination(diff, "Federación", "Confederación")).toBe(false);
  });

  it("detecta sección del concepto opuesto usada para el otro", () => {
    const diff = makeDifference({
      source_section_a: "Confederación",
      source_section_b: "Confederación",
    });
    expect(hasCrossSectionContamination(diff, "Federación", "Confederación")).toBe(true);
  });

  it("genera warning (no filtra) para diferencias con sección sospechosa", () => {
    const comp = makeComparison({
      differences: [
        makeDifference(),
        makeDifference({
          aspect: "Senado",
          source_section_a: "Confederación",
          source_section_b: "Confederación",
        }),
      ],
    });
    const result = validateComparison(comp);
    expect(result.filteredDifferences).toHaveLength(2);
    expect(result.addedWarnings.some((w) => w.includes("verificar sección fuente"))).toBe(true);
  });
});

// ── Test 7b: Detección de inferencia inversa ──
describe("inferencia inversa", () => {
  it("detecta valor negativo no respaldado por la fuente", () => {
    expect(looksLikeInverseInference(
      "Tiene órganos centrales",
      "No tiene órganos centrales",
      "existencia de órganos centrales en el Estado Federal",
      "la confederación es una unión de estados soberanos",
    )).toBe(true);
  });

  it("detecta 'carece de' como inferencia inversa", () => {
    expect(looksLikeInverseInference(
      "Tiene derecho de secesión",
      "Carece de derecho de secesión",
      "los estados confederados retienen el derecho de secesión",
      "la federación se basa en una constitución",
    )).toBe(true);
  });

  it("detecta 'menor grado' como inferencia de 'mayor grado'", () => {
    expect(looksLikeInverseInference(
      "Menor grado de descentralización",
      "Mayor grado de descentralización",
      "la federación divide el poder en el territorio",
      "mayor grado de descentralización del poder territorial",
    )).toBe(true);
  });

  it("detecta valores binarios sí/no como inferencia", () => {
    expect(looksLikeInverseInference(
      "sí",
      "no",
      "El gobierno central tiene imperium sobre todo el territorio",
      "Los Estados confederados conservan su plena soberanía",
    )).toBe(true);
  });

  it("no marca como inferencia cuando ambos lados están respaldados", () => {
    expect(looksLikeInverseInference(
      "Constitución",
      "Pacto",
      "La federación se basa en una constitución como norma suprema",
      "La confederación se origina en un pacto entre Estados soberanos",
    )).toBe(false);
  });

  it("no marca cuando la negación aparece en la fuente", () => {
    expect(looksLikeInverseInference(
      "No tienen derecho de secesión",
      "Retienen derecho de secesión",
      "Los estados miembros no pueden separarse unilateralmente (no tienen derecho de secesión)",
      "Los estados confederados retienen el derecho de secesión",
    )).toBe(false);
  });

  it("genera warning para diferencia con posible inferencia inversa", () => {
    const comp = makeComparison({
      differences: [
        makeDifference({
          aspect: "Órganos centrales",
          concept_a_value: "Existen órganos centrales",
          concept_b_value: "No existen órganos centrales",
          source_a: "existencia de órganos centrales en el Estado Federal",
          source_b: "la confederación es una unión de estados soberanos",
        }),
      ],
    });
    const result = validateComparison(comp);
    expect(result.addedWarnings.some((w) => w.includes("posible inferencia inversa"))).toBe(true);
  });
});

// ── Test 7c: Citas fabricadas (meta-declaraciones) ──
describe("citas fabricadas", () => {
  it("detecta 'no se menciona' como meta-declaración", () => {
    expect(hasFabricatedSource("No se menciona imperium sobre los Estados confederados.")).toBe(true);
  });

  it("detecta 'el material no' como meta-declaración", () => {
    expect(hasFabricatedSource("El material no desarrolla este punto.")).toBe(true);
  });

  it("detecta 'la fuente no' como meta-declaración", () => {
    expect(hasFabricatedSource("La fuente no establece este criterio.")).toBe(true);
  });

  it("acepta cita textual real", () => {
    expect(hasFabricatedSource("Los estados miembros gozan de autonomía pero no de soberanía.")).toBe(false);
  });

  it("filtra diferencia con source fabricado", () => {
    const diff = makeDifference({
      aspect: "Imperium",
      source_b: "No se menciona imperium sobre los Estados confederados.",
    });
    expect(hasUnsourcedDifference(diff)).toBe(true);
  });
});

// ── Test 8: Conocimiento externo presentado como fuente ──
describe("conocimiento externo", () => {
  it("detecta semejanza sin source_fragment", () => {
    expect(hasUnsourcedSimilarity(makeSimilarity({ source_fragment: "" }))).toBe(true);
  });

  it("acepta semejanza con source_fragment suficiente", () => {
    expect(hasUnsourcedSimilarity(makeSimilarity())).toBe(false);
  });
});

// ── Test 9: Contradicción con el documento ──
describe("contradicción con el documento", () => {
  it("documenta caso: Suiza como confederación actual", () => {
    const comp = makeComparison({
      example: "Suiza es actualmente una confederación.",
      example_type: "didactic",
    });
    expect(comp.example_type).toBe("didactic");
  });
});

// ── Test 10: Sección completada artificialmente para llenar UI ──
describe("secciones artificiales", () => {
  it("acepta comparación sin semejanzas (array vacío)", () => {
    const comp = makeComparison({ similarities: [] });
    const result = validateComparison(comp);
    expect(result.filteredSimilarities).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it("acepta comparación sin ejemplo", () => {
    expect(validateComparisonSyntax(makeComparison({ example: "", example_type: "none" }))).toBe(true);
  });

  it("acepta comparación sin normativa", () => {
    expect(validateComparisonSyntax(makeComparison({ articles: "" }))).toBe(true);
  });

  it("rechaza comparación sin diferencias válidas", () => {
    const comp = makeComparison({
      differences: [makeDifference({ source_a: "", source_b: "" })],
    });
    const result = validateComparison(comp);
    expect(result.filteredDifferences).toHaveLength(0);
    expect(result.valid).toBe(false);
  });

  it("acepta comparación con mentioned_criteria", () => {
    const comp = makeComparison({
      mentioned_criteria: [
        "existencia de órganos centrales",
        "imperium sobre los Estados y sus habitantes",
      ],
    });
    expect(validateComparisonSyntax(comp)).toBe(true);
    expect(comp.mentioned_criteria).toHaveLength(2);
  });
});
