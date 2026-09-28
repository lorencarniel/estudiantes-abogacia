import { describe, it, expect } from "vitest";

// Import the module's internals by re-declaring the pure functions here
// since the route exports only the handler. We test the parsing/coverage logic.

const stopwords = new Set([
  "del", "de", "la", "las", "los", "el", "en", "un", "una", "unos", "unas",
  "con", "por", "para", "que", "como", "entre", "sobre", "sin", "ante",
  "desde", "hasta", "hacia", "sus", "son", "ser", "estar", "hay",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "aquel", "aquella", "mas", "muy", "todo", "toda", "todos", "todas",
  "cada", "otro", "otra", "otros", "otras", "mismo", "misma",
  "puede", "pueden", "tiene", "tienen", "debe", "deben",
  "parte", "caso", "casos", "forma", "formas", "tipo", "tipos",
  "concepto", "conceptos", "aspecto", "aspectos", "punto", "puntos",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));
}

interface SyllabusUnit {
  title: string;
  keywords: string[];
}

function parseSyllabusUnits(content: string): SyllabusUnit[] {
  const lines = content.split("\n");
  const units: SyllabusUnit[] = [];
  let current: SyllabusUnit | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const unitMatch = line.match(
      /^(?:unidad|bolilla|eje|m[oó]dulo|tema|cap[ií]tulo)\s*(?:n[°ºo.]?\s*)?(\d+|[IVXLC]+)\s*[:\-–—.]?\s*(.+)?/i,
    );
    if (unitMatch) {
      const title = unitMatch[2]?.trim() || `Unidad ${unitMatch[1]}`;
      current = { title, keywords: extractKeywords(title) };
      units.push(current);
      continue;
    }

    if (current && line.length > 5) {
      const kw = extractKeywords(line);
      current.keywords.push(...kw);
    }
  }
  return units;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, " ").replace(/\s+/g, " ");
}

function checkCoverage(
  units: SyllabusUnit[],
  materialText: string,
): { unit: string; covered: boolean; ratio: number }[] {
  const normalized = normalizeText(materialText);
  return units.map((u) => {
    const unique = Array.from(new Set(u.keywords));
    if (unique.length === 0) {
      return { unit: u.title, covered: false, ratio: 0 };
    }
    const matched = unique.filter((kw) => normalized.includes(kw));
    const ratio = matched.length / unique.length;
    return { unit: u.title, covered: ratio >= 0.3, ratio: Math.round(ratio * 100) / 100 };
  });
}

// ── Tests ──

describe("parseSyllabusUnits", () => {
  it("parses standard 'Unidad N:' format", () => {
    const content = `
Unidad 1: Derecho Constitucional
Conceptos fundamentales
Fuentes del derecho

Unidad 2: Formas de Estado
Estado federal y unitario
Autonomía provincial
    `;
    const units = parseSyllabusUnits(content);
    expect(units).toHaveLength(2);
    expect(units[0].title).toBe("Derecho Constitucional");
    expect(units[1].title).toBe("Formas de Estado");
    expect(units[0].keywords.length).toBeGreaterThan(0);
    expect(units[1].keywords).toContain("federal");
    expect(units[1].keywords).toContain("unitario");
    expect(units[1].keywords).toContain("autonomía");
    expect(units[1].keywords).toContain("provincial");
  });

  it("parses 'Bolilla' format", () => {
    const content = `
Bolilla 1 - Introducción al derecho público
Bolilla 2 - Poder constituyente
    `;
    const units = parseSyllabusUnits(content);
    expect(units).toHaveLength(2);
    expect(units[0].title).toBe("Introducción al derecho público");
  });

  it("parses 'Módulo' and 'Tema' formats", () => {
    const content = `
Módulo 1: Principios republicanos
Tema 2: División de poderes
    `;
    const units = parseSyllabusUnits(content);
    expect(units).toHaveLength(2);
  });

  it("returns empty for unstructured text", () => {
    const content = "Esto es un texto sin estructura de unidades.";
    const units = parseSyllabusUnits(content);
    expect(units).toHaveLength(0);
  });
});

describe("checkCoverage", () => {
  const syllabus = `
Unidad 1: Derecho Constitucional y poder constituyente
Supremacía constitucional
Control de constitucionalidad

Unidad 2: Formas de Estado
Estado federal, unitario y confederado
Autonomía provincial

Unidad 3: Derechos y garantías
Derechos civiles y políticos
Amparo, habeas corpus
  `;

  it("detects full coverage when material covers all units", () => {
    const material = `
    El derecho constitucional argentino se basa en la supremacía constitucional
    y el control de constitucionalidad. El poder constituyente originario creó la CN.
    Las formas de estado incluyen el estado federal, unitario y confederado.
    La autonomía provincial está reconocida en la CN.
    Los derechos y garantías incluyen derechos civiles y políticos.
    El amparo y el habeas corpus son garantías procesales.
    `;
    const units = parseSyllabusUnits(syllabus);
    const coverage = checkCoverage(units, material);
    expect(coverage.filter((c) => c.covered)).toHaveLength(3);
  });

  it("detects partial coverage", () => {
    const material = `
    El derecho constitucional se basa en la supremacía constitucional.
    El poder constituyente originario y derivado. Control de constitucionalidad.
    `;
    const units = parseSyllabusUnits(syllabus);
    const coverage = checkCoverage(units, material);
    const covered = coverage.filter((c) => c.covered);
    expect(covered.length).toBeGreaterThanOrEqual(1);
    expect(covered.length).toBeLessThan(3);
  });

  it("detects no coverage for unrelated material", () => {
    const material = `
    Los contratos de compraventa se rigen por el Código Civil y Comercial.
    Las obligaciones de dar sumas de dinero tienen reglas especiales.
    `;
    const units = parseSyllabusUnits(syllabus);
    const coverage = checkCoverage(units, material);
    const covered = coverage.filter((c) => c.covered);
    expect(covered.length).toBe(0);
  });
});
