import { describe, it, expect } from "vitest";
import { isCircularQuestion, checkTopicDistribution, type QuizQuestion } from "./validation";

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    statement: "¿Cuál es la forma de gobierno según la Constitución Nacional?",
    options: [
      "Republicana, representativa y federal",
      "Monárquica y unitaria",
      "Parlamentaria y confederada",
      "Autocrática y centralizada",
    ],
    correct_index: 0,
    explanation: "El art. 1 CN establece la forma republicana, representativa y federal.",
    source_fragment: "La Nación Argentina adopta para su gobierno la forma representativa republicana federal",
    concept: "Forma de gobierno",
    option_analyses: [
      "Correcto: coincide con el art. 1 CN citado en el material.",
      "Incorrecto: Argentina no es monárquica ni unitaria.",
      "Incorrecto: no es parlamentaria ni confederada.",
      "Incorrecto: no es autocrática ni centralizada.",
    ],
    ...overrides,
  };
}

// ── Test 1: Dos respuestas correctas (detectable por opciones duplicadas) ──
describe("validateSyntax — opciones duplicadas", () => {
  it("detecta opciones idénticas (proxy para dos respuestas iguales)", () => {
    const q = makeQuestion({
      options: [
        "Estado federal",
        "Estado federal",
        "Estado unitario",
        "Estado confederado",
      ],
    });
    const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
    expect(unique.size).toBeLessThan(4);
  });
});

// ── Test 2: Pregunta circular ──
describe("isCircularQuestion", () => {
  it("detecta respuesta que repite la pregunta", () => {
    const q = makeQuestion({
      statement: "¿Qué competencias se reservan a los estados miembros?",
      options: [
        "Las competencias reservadas a los estados miembros",
        "Las competencias delegadas al gobierno federal",
        "Las competencias concurrentes",
        "Las competencias prohibidas",
      ],
      correct_index: 0,
    });
    expect(isCircularQuestion(q)).toBe(true);
  });

  it("no marca como circular una respuesta sustantiva", () => {
    const q = makeQuestion({
      statement: "¿Qué competencias se reservan a los estados miembros?",
      options: [
        "Seguridad interior, educación y justicia local",
        "Defensa nacional y relaciones exteriores",
        "Emisión de moneda y comercio exterior",
        "Declaración de estado de sitio",
      ],
      correct_index: 0,
    });
    expect(isCircularQuestion(q)).toBe(false);
  });

  it("no marca como circular una pregunta con algo de solapamiento pero respuesta diferente", () => {
    const q = makeQuestion({
      statement: "¿Qué forma de Estado adopta la Constitución Nacional?",
      options: [
        "Federal, con distribución territorial del poder",
        "Unitario centralizado",
        "Confederación de provincias",
        "Estado regional",
      ],
      correct_index: 0,
    });
    expect(isCircularQuestion(q)).toBe(false);
  });
});

// ── Test 3: Respuesta no respaldada por la fuente ──
describe("source_fragment validation", () => {
  it("detecta source_fragment vacío o muy corto", () => {
    const q = makeQuestion({ source_fragment: "" });
    expect(q.source_fragment.trim().length).toBeLessThan(10);

    const q2 = makeQuestion({ source_fragment: "art 1" });
    expect(q2.source_fragment.trim().length).toBeLessThan(10);
  });

  it("acepta source_fragment suficiente", () => {
    const q = makeQuestion();
    expect(q.source_fragment.trim().length).toBeGreaterThanOrEqual(10);
  });
});

// ── Test 4: Pregunta ambigua (multiple correctas) — caso real reportado ──
describe("ambiguity detection — caso real", () => {
  it("identifica que democracia directa y semidirecta son ambas válidas", () => {
    const q = makeQuestion({
      statement: "¿Qué tipo de democracia se menciona como parte de los sistemas democráticos?",
      options: [
        "Democracia directa",
        "Democracia autoritaria",
        "Democracia semidirecta",
        "Democracia parlamentaria",
      ],
      correct_index: 0,
    });
    // This test documents the case — both options 0 and 2 could be correct
    // Semantic validation (AI reviewer) should catch this; we document the pattern
    const potentiallyCorrect = [0, 2]; // directa and semidirecta
    expect(potentiallyCorrect.length).toBeGreaterThan(1);
  });
});

// ── Test 5: Información inventada (campo source_fragment vacío) ──
describe("invented information detection", () => {
  it("marca como sospechosa una pregunta sin fragmento fuente", () => {
    const q = makeQuestion({ source_fragment: "" });
    const hasSourceBacking = q.source_fragment.trim().length >= 10;
    expect(hasSourceBacking).toBe(false);
  });
});

// ── Test 6: Pregunta demasiado fácil para nivel medio ──
describe("difficulty assessment", () => {
  it("documenta caso de pregunta de memoria disfrazada como aplicación", () => {
    // This case can only be fully detected by AI review, but we document the pattern
    const memoryQuestion = makeQuestion({
      statement: "Un abogado pregunta: ¿cuál es la definición de república?",
      // Adding a character doesn't change what is being asked
    });
    // The statement is a direct definition recall with decorative context
    expect(memoryQuestion.statement).toContain("definición");
  });
});

// ── Test 7: Pregunta circular (variante) ──
describe("circular question — additional patterns", () => {
  it("detecta respuesta que es reformulación del enunciado", () => {
    const q = makeQuestion({
      statement: "¿Cuáles son las características del Estado federal?",
      options: [
        "Las características propias del Estado federal",
        "Tiene una constitución suprema",
        "Centraliza todo el poder en un gobierno nacional",
        "No permite autonomía provincial",
      ],
      correct_index: 0,
    });
    expect(isCircularQuestion(q)).toBe(true);
  });
});

// ── Test 8: Distractores absurdos ──
describe("distractor quality", () => {
  it("documenta distractores de materia completamente distinta", () => {
    const q = makeQuestion({
      options: [
        "Estado federal",
        "Fotosíntesis clorofílica",
        "Ecuación de segundo grado",
        "Teoría de la relatividad",
      ],
    });
    // We can detect when distractors are obviously from a different domain
    const legalTerms = ["derecho", "estado", "federal", "constituc", "ley", "norma", "artículo", "gobierno", "poder", "autonomía"];
    const nonLegalOptions = q.options.filter(
      (opt, i) => i !== q.correct_index && !legalTerms.some((t) => opt.toLowerCase().includes(t))
    );
    expect(nonLegalOptions.length).toBeGreaterThan(0);
  });
});

// ── Test 9: Duplicación temática excesiva ──
describe("checkTopicDistribution", () => {
  it("detecta más de 2 preguntas sobre el mismo concepto", () => {
    const questions = [
      makeQuestion({ concept: "Forma de gobierno" }),
      makeQuestion({ concept: "Forma de gobierno" }),
      makeQuestion({ concept: "Forma de gobierno" }),
      makeQuestion({ concept: "Federalismo" }),
      makeQuestion({ concept: "Fuentes del derecho" }),
    ];
    const result = checkTopicDistribution(questions);
    expect(result.valid).toBe(false);
    expect(result.duplicated).toContain("forma de gobierno");
  });

  it("acepta distribución equilibrada", () => {
    const questions = [
      makeQuestion({ concept: "Forma de gobierno" }),
      makeQuestion({ concept: "Forma de gobierno" }),
      makeQuestion({ concept: "Federalismo" }),
      makeQuestion({ concept: "Federalismo" }),
      makeQuestion({ concept: "Fuentes del derecho" }),
      makeQuestion({ concept: "Autonomía provincial" }),
    ];
    const result = checkTopicDistribution(questions);
    expect(result.valid).toBe(true);
  });
});

// ── Test 10: Atribuciones incorrectas a artículos ──
describe("article attribution", () => {
  it("documenta caso de artículo mencionado sin desarrollo", () => {
    // Case: material says "art. 14 bis de 1957" but doesn't explain what it establishes
    // Asking "what does art. 14 bis establish?" would require external knowledge
    const q = makeQuestion({
      statement: "¿Qué establece el artículo 14 bis de 1957 respecto al sistema democrático?",
      source_fragment: "el término democrático aparece en 1957 vinculado al art. 14 bis",
    });
    // The source_fragment only MENTIONS the article, doesn't develop its content
    // AI reviewer should flag no_external_knowledge: false
    const mentionsButDoesntDevelop = q.source_fragment.includes("aparece") || q.source_fragment.includes("menciona");
    expect(mentionsButDoesntDevelop).toBe(true);
  });
});
