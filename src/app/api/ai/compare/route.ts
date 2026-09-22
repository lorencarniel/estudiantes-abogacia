import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH, SIMPLE_MODE_SUFFIX } from "@/lib/ai";
import { compareConceptsPrompt, compareConceptsSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

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
      max_tokens: 4000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);

    await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "comparison",
        title: content.title || "Comparación de conceptos",
        content: JSON.stringify(content),
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json(content);
  } catch (err) {
    console.error("Compare concepts error:", err);
    return NextResponse.json({ error: "Error al generar la comparación. Intentá de nuevo." }, { status: 502 });
  }
}
