import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { quizPrompt, quizSchema, ExamType } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";
import { safeJsonParse } from "@/lib/utils";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  difficulty: z.enum(["facil", "media", "dificil"]),
  examType: z.enum(["parcial", "final", "libre"]).optional(),
  syllabusId: z.string().optional(),
});

const gradeSchema = z.object({
  quizId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3).nullable()).length(10),
});

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

  const { text, difficulty, examType, syllabusId } = parsed.data;

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
        { role: "user", content: quizPrompt(text, difficulty, [], examType as ExamType | undefined, syllabusContent) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "exam", strict: true, schema: quizSchema },
      },
      temperature: 0.5,
      max_tokens: 4000,
    });

    const content = JSON.parse(response.choices[0].message.content || "{}");

    const quiz = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        title: `Cuestionario - ${difficulty}${examType ? ` (${examType})` : ""}`,
        difficulty,
        examType: examType || null,
        questions: JSON.stringify(content.questions),
        total: 10,
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json({
      quizId: quiz.id,
      difficulty,
      questions: content.questions.map(
        (q: { statement: string; options: string[] }, i: number) => ({
          number: i + 1,
          statement: q.statement,
          options: q.options,
        })
      ),
    });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el cuestionario. Intentá de nuevo." },
      { status: 502 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Respuestas inválidas" }, { status: 400 });
  }

  const { quizId, answers } = parsed.data;

  const quiz = await prisma.quizAttempt.findFirst({
    where: { id: quizId, userId: session.user.id, completedAt: null },
  });

  if (!quiz) {
    return NextResponse.json(
      { error: "Cuestionario no encontrado o ya entregado" },
      { status: 404 }
    );
  }

  const questions = safeJsonParse(quiz.questions, []) as Array<{
    statement: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;

  const results = questions.map((q, i) => ({
    number: i + 1,
    statement: q.statement,
    options: q.options,
    selected: answers[i],
    correct_index: q.correct_index,
    correct: answers[i] === q.correct_index,
    explanation: q.explanation,
  }));

  const score = results.filter((r) => r.correct).length;
  const passed = score >= 7;

  await prisma.quizAttempt.update({
    where: { id: quizId },
    data: { answers: JSON.stringify(answers), score, passed, completedAt: new Date() },
  });

  addXP(session.user.id, "quiz_complete").catch(() => {});
  if (passed) addXP(session.user.id, "quiz_pass").catch(() => {});
  return NextResponse.json({ score, total: 10, passed, results });
}
