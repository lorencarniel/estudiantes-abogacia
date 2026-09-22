import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, SIMPLE_MODE_SUFFIX } from "@/lib/ai";
import { outlinePrompt, outlineSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  syllabusId: z.string().optional(),
  simpleMode: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Texto inválido (mínimo 80 caracteres)" }, { status: 400 });
  }

  const { text, syllabusId, simpleMode } = parsed.data;

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
        { role: "user", content: outlinePrompt(text, syllabusContent) + (simpleMode ? SIMPLE_MODE_SUFFIX : "") },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "outline", strict: true, schema: outlineSchema },
      },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);

    const saved = await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "outline",
        title: content.title || "Esquema",
        content: JSON.stringify(content),
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json({ id: saved.id, ...content });
  } catch (err) {
    console.error("Outline generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el esquema. Intentá de nuevo." },
      { status: 502 }
    );
  }
}
