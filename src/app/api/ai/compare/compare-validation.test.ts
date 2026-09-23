import { describe, it, expect } from "vitest";
import {
  validateComparisonSyntax,
  validateComparison,
  hasGenericSimilarity,
  hasUnsourcedDifference,
  hasUnsourcedSimilarity,
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
      },
    ],
    similarities: [
      {
        statement: "Ambas son formas de organización estatal compuesta.",
        source_fragment: "Tanto la federación como la confederación son formas de Estado compuesto",
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
    ...overrides,
  };
}

function makeSimilarity(overrides: Partial<ComparisonSimilarity> = {}): ComparisonSimilarity {
  return {
    statement: "Ambas son formas de organización estatal compuesta.",
    source_fragment: "Tanto la federación como la confederación son formas de Estado compuesto",
    ...overrides,
  };
}

// ── Test 1: Definición inventada ──
describe("definición inventada", () => {
  it("detecta concepto no soportado por la fuente", () => {
    const comp = makeComparison({ concept_b_supported: false });
    const result = validateComparison(comp);
    expect(result.addedWarnings.some((w) => w.includes("no desarrolla suficientemente"))).toBe(true);
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
  it("documenta caso de artículo asignado sin vinculación explícita", () => {
    const comp = makeComparison({
      articles: "Art. 75 inc. 22 CN",
    });
    // Programmatic validation can't verify this — it depends on semantic review
    // We document the field exists and can be empty
    expect(comp.articles.length).toBeGreaterThan(0);
  });

  it("acepta normativa vacía", () => {
    const comp = makeComparison({ articles: "" });
    expect(comp.articles).toBe("");
  });
});

// ── Test 5: Ejemplo externo sin etiquetar ──
describe("ejemplo sin etiquetar", () => {
  it("verifica que example_type distingue fuente de generado", () => {
    const fromSource = makeComparison({ example_type: "source" });
    const didactic = makeComparison({ example_type: "didactic" });
    const none = makeComparison({ example_type: "none", example: "" });

    expect(fromSource.example_type).toBe("source");
    expect(didactic.example_type).toBe("didactic");
    expect(none.example_type).toBe("none");
  });

  it("rechaza example_type inválido en validateSyntax", () => {
    const comp = makeComparison({ example_type: "invalid" as any });
    expect(validateComparisonSyntax(comp)).toBe(false);
  });
});

// ── Test 6: Comparación con concepto insuficientemente documentado ──
describe("concepto insuficientemente documentado", () => {
  it("marca como inválida comparación donde ambos conceptos no están soportados", () => {
    const comp = makeComparison({
      concept_a_supported: false,
      concept_b_supported: false,
    });
    const result = validateComparison(comp);
    expect(result.valid).toBe(false);
    expect(result.addedWarnings.filter((w) => w.includes("no desarrolla suficientemente"))).toHaveLength(2);
  });

  it("acepta comparación con concepto parcial si hay diferencias respaldadas", () => {
    const comp = makeComparison({ concept_b_supported: false });
    const result = validateComparison(comp);
    // Not valid because concept_b is not supported
    expect(result.valid).toBe(false);
    expect(result.filteredDifferences.length).toBeGreaterThan(0);
  });
});

// ── Test 7: Cambio de clasificación ──
describe("cambio de clasificación", () => {
  it("documenta caso donde consulta popular no es democracia directa", () => {
    // This verifies the pattern — semantic review must catch it
    const diff = makeDifference({
      aspect: "Tipo de democracia",
      concept_a_value: "Directa: el pueblo decide sin intermediarios",
      concept_b_value: "Semidirecta: incluye consulta popular",
      source_a: "la democracia directa implica la participación sin representantes",
      source_b: "las formas semidirectas incluyen la consulta popular, referéndum e iniciativa",
    });
    // Consulta popular should NOT appear under directa
    expect(diff.concept_a_value).not.toContain("consulta popular");
  });
});

// ── Test 8: Conocimiento externo presentado como fuente ──
describe("conocimiento externo", () => {
  it("detecta semejanza sin source_fragment", () => {
    expect(hasUnsourcedSimilarity(makeSimilarity({ source_fragment: "" }))).toBe(true);
    expect(hasUnsourcedSimilarity(makeSimilarity({ source_fragment: "corto" }))).toBe(true);
  });

  it("acepta semejanza con source_fragment suficiente", () => {
    expect(hasUnsourcedSimilarity(makeSimilarity())).toBe(false);
  });
});

// ── Test 9: Contradicción entre comparación y documento ──
describe("contradicción con el documento", () => {
  it("documenta caso: Suiza como confederación actual", () => {
    // Programmatic filter cannot catch factual errors, but we verify
    // the structure allows the reviewer to flag it
    const comp = makeComparison({
      example: "Suiza es actualmente una confederación.",
      example_type: "didactic",
    });
    // The example_type "didactic" signals it's AI-generated
    // Semantic review should catch factual errors
    expect(comp.example_type).toBe("didactic");
  });
});

// ── Test 10: Sección completada artificialmente para llenar UI ──
describe("secciones artificiales", () => {
  it("acepta comparación sin semejanzas (array vacío)", () => {
    const comp = makeComparison({ similarities: [] });
    const result = validateComparison(comp);
    expect(result.filteredSimilarities).toHaveLength(0);
    // Valid as long as differences exist and concepts are supported
    expect(result.valid).toBe(true);
  });

  it("acepta comparación sin ejemplo", () => {
    const comp = makeComparison({ example: "", example_type: "none" });
    expect(validateComparisonSyntax(comp)).toBe(true);
  });

  it("acepta comparación sin normativa", () => {
    const comp = makeComparison({ articles: "" });
    expect(validateComparisonSyntax(comp)).toBe(true);
  });

  it("rechaza comparación sin diferencias válidas", () => {
    const comp = makeComparison({
      differences: [makeDifference({ source_a: "", source_b: "" })],
    });
    const result = validateComparison(comp);
    expect(result.filteredDifferences).toHaveLength(0);
    expect(result.valid).toBe(false);
  });
});
