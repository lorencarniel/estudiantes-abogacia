import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH, SIMPLE_MODE_SUFFIX } from "@/lib/ai";
import {
  compareConceptsPrompt,
  compareConceptsSchema,
  compareValidationPrompt,
  compareValidationSchema,
} from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import {
  type Comparison,
  validateComparisonSyntax,
  validateComparison,
  hasFabricatedSource,
} from "./validation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, syllabusId, simpleMode } = await request.json();

  if (!text || text.length < 80) {
    return NextResponse.json({ error: "El texto debe tener al menos 80 caracteres" }, { status: 400 });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "El texto supera el límite de caracteres" }, { status: 400 });
  }

  let syllabusContent: string | undefined;
  if (syllabusId) {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: syllabusId, userId: session.user.id },
    });
    if (syllabus) syllabusContent = syllabus.content;
  }

  try {
    // STEP 1: Generate comparisons with source grounding rules
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: compareConceptsPrompt(text, syllabusContent) + (simpleMode ? SIMPLE_MODE_SUFFIX : "") },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "compare_concepts", strict: true, schema: compareConceptsSchema },
      },
      temperature: 0.3,
      max_tokens: 8000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, { title: "", comparisons: [] } as {
      title: string;
      comparisons: Comparison[];
    });

    // STEP 2: Programmatic validation — filter unsourced content
    const cleanJsonArtifacts = (s: string) => s.replace(/[{}\[\]],?\s*$/g, "").trim();
    const validatedComparisons: Comparison[] = [];
    for (const comp of content.comparisons) {
      if (!comp.mentioned_criteria) comp.mentioned_criteria = [];
      if (!validateComparisonSyntax(comp)) continue;

      for (const d of comp.differences) {
        d.source_section_a = cleanJsonArtifacts(d.source_section_a);
        d.source_section_b = cleanJsonArtifacts(d.source_section_b);
      }
      for (const s of comp.similarities) {
        s.source_section = cleanJsonArtifacts(s.source_section);
      }

      const rescuedCriteria: string[] = [];
      for (const d of comp.differences) {
        if (hasFabricatedSource(d.source_a) || hasFabricatedSource(d.source_b)) {
          rescuedCriteria.push(d.aspect);
        }
      }

      const result = validateComparison(comp);
      const allMentionedCriteria = [...comp.mentioned_criteria, ...rescuedCriteria];
      const uniqueCriteria = Array.from(new Set(allMentionedCriteria));

      validatedComparisons.push({
        ...comp,
        differences: result.filteredDifferences,
        mentioned_criteria: uniqueCriteria,
        similarities: result.filteredSimilarities,
        warnings: [...comp.warnings, ...result.addedWarnings],
        example: comp.example_type === "none" ? "" : comp.example,
      });
    }

    // STEP 3: Semantic validation (independent reviewer)
    let finalComparisons = validatedComparisons;
    if (validatedComparisons.length > 0) {
      try {
        const valResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: "Sos un verificador independiente de comparaciones jurídicas para estudio universitario. Evaluá con rigor si cada comparación se basa fielmente en el material fuente.",
            },
            { role: "user", content: compareValidationPrompt(text, validatedComparisons as unknown as Array<Record<string, unknown>>) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "compare_validation", strict: true, schema: compareValidationSchema },
          },
          temperature: 0,
          max_tokens: 4000,
        });

        const valContent = safeJsonParse(valResponse.choices?.[0]?.message?.content, { results: [] } as {
          results: Array<{ comparison_index: number; approved: boolean; reason: string }>;
        });

        const rejectedIndexes = new Set(
          valContent.results.filter((r) => !r.approved).map((r) => r.comparison_index)
        );

        if (rejectedIndexes.size > 0 && rejectedIndexes.size < validatedComparisons.length) {
          finalComparisons = validatedComparisons.filter((_, i) => !rejectedIndexes.has(i));
        } else if (rejectedIndexes.size > 0) {
          finalComparisons = validatedComparisons.map((comp, i) => {
            const result = valContent.results.find((r) => r.comparison_index === i);
            if (result && !result.approved) {
              return {
                ...comp,
                warnings: [...comp.warnings, `⚠️ Revisión: ${result.reason}`],
              };
            }
            return comp;
          });
        }
      } catch {
        // Keep programmatically validated version if semantic validation fails
      }
    }

    const output = {
      title: content.title || "Comparación de conceptos",
      comparisons: finalComparisons,
    };

    await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "comparison",
        title: output.title,
        content: JSON.stringify(output),
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error("Compare concepts error:", err);
    return NextResponse.json({ error: "Error al generar la comparación. Intentá de nuevo." }, { status: 502 });
  }
}
