import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  syllabusId: z.string().min(1),
});

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

function extractKeywords(text: string): string[] {
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

  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, " ").replace(/\s+/g, " ");
}

function checkCoverage(
  units: SyllabusUnit[],
  materialText: string,
): { unit: string; covered: boolean; matchedKeywords: string[]; totalKeywords: number; ratio: number }[] {
  const normalized = normalizeText(materialText);

  return units.map((u) => {
    const unique = Array.from(new Set(u.keywords));
    if (unique.length === 0) {
      return { unit: u.title, covered: false, matchedKeywords: [], totalKeywords: 0, ratio: 0 };
    }
    const matched = unique.filter((kw) => normalized.includes(kw));
    const ratio = matched.length / unique.length;
    return {
      unit: u.title,
      covered: ratio >= 0.3,
      matchedKeywords: matched,
      totalKeywords: unique.length,
      ratio: Math.round(ratio * 100) / 100,
    };
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { text, syllabusId } = parsed.data;

  const syllabus = await prisma.syllabus.findFirst({
    where: { id: syllabusId, userId: session.user.id },
  });
  if (!syllabus) {
    return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });
  }

  const units = parseSyllabusUnits(syllabus.content);
  if (units.length === 0) {
    return NextResponse.json({
      warning: "No se pudieron identificar unidades en el programa. Revisá que el programa tenga títulos como 'Unidad 1:', 'Bolilla 2:', etc.",
      coverage: [],
      coveredCount: 0,
      totalUnits: 0,
    });
  }

  const coverage = checkCoverage(units, text);
  const coveredCount = coverage.filter((c) => c.covered).length;

  return NextResponse.json({
    coverage,
    coveredCount,
    totalUnits: units.length,
    syllabusTitle: syllabus.title,
  });
}
