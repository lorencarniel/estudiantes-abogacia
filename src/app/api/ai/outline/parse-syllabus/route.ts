import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { parseSyllabusPrompt, parseSyllabusSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

const requestSchema = z.object({
  syllabusId: z.string(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "syllabusId requerido" }, { status: 400 });
  }

  const syllabus = await prisma.syllabus.findFirst({
    where: { id: parsed.data.syllabusId, userId: session.user.id },
  });
  if (!syllabus) {
    return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parseSyllabusPrompt(syllabus.content) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "syllabus_units", strict: true, schema: parseSyllabusSchema },
      },
      temperature: 0,
      max_tokens: 4000,
    });

    const content = safeJsonParse(
      response.choices?.[0]?.message?.content,
      { units: [] } as { units: Array<{ number: number; title: string; topics: string[] }> }
    );

    return NextResponse.json(content);
  } catch (err) {
    console.error("Parse syllabus error:", err);
    return NextResponse.json(
      { error: "No se pudo parsear el programa." },
      { status: 502 }
    );
  }
}
