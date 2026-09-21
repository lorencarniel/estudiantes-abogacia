import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH } from "@/lib/ai";
import { oralExamPrompt, oralExamSchema, ExamType } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, examType, syllabusId } = await request.json();

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

  const validExamType = ["parcial", "final", "libre"].includes(examType)
    ? (examType as ExamType)
    : undefined;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: oralExamPrompt(text, validExamType, syllabusContent) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "oral_exam", strict: true, schema: oralExamSchema },
      },
      temperature: 0.5,
      max_tokens: 3000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);
    return NextResponse.json(content);
  } catch (err) {
    console.error("Oral exam error:", err);
    return NextResponse.json({ error: "Error al generar el examen. Intentá de nuevo." }, { status: 502 });
  }
}
