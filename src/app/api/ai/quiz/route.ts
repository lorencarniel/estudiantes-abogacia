import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import {
  quizTopicsPrompt,
  quizTopicsSchema,
  quizPrompt,
  quizSchema,
  quizValidationPrompt,
  quizValidationSchema,
  ExamType,
} from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";
import { safeJsonParse } from "@/lib/utils";
import { type QuizQuestion, validateSyntax, isCircularQuestion } from "./validation";

// ── Route schemas ──

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  difficulty: z.enum(["facil", "media", "dificil"]),
  examType: z.enum(["parcial", "final", "libre"]).optional(),
  syllabusId: z.string().optional(),
});

const gradeSchema = z.object({
  quizId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3).nullable()).min(1).max(10),
});

// ── POST: Generate quiz ──

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
    // STEP 1: Extract topics for distribution
    let topics: string[] = [];
    try {
      const topicsResponse = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: quizTopicsPrompt(text) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "quiz_topics", strict: true, schema: quizTopicsSchema },
        },
        temperature: 0,
        max_tokens: 2000,
      });
      const topicsContent = safeJsonParse(topicsResponse.choices?.[0]?.message?.content, { topics: [] });
      topics = topicsContent.topics.map((t: { name: string }) => t.name);
    } catch {
      // Continue without topic distribution if extraction fails
    }

    // STEP 2: Generate questions
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: quizPrompt(text, difficulty, [], examType as ExamType | undefined, syllabusContent, topics),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "exam", strict: true, schema: quizSchema },
      },
      temperature: 0.3,
      max_tokens: 12000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, { questions: [] } as { questions: QuizQuestion[] });

    // STEP 3: Programmatic validation
    let candidates: QuizQuestion[] = [];
    for (const q of content.questions) {
      if (!validateSyntax(q)) continue;
      if (isCircularQuestion(q)) continue;
      candidates.push(q);
    }

    // STEP 4: Semantic validation (independent reviewer)
    let approved: QuizQuestion[] = [];
    if (candidates.length > 0) {
      try {
        const valResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: "Sos un verificador independiente de calidad de exámenes universitarios de derecho argentino. Evaluá con rigor.",
            },
            { role: "user", content: quizValidationPrompt(text, candidates) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "quiz_validation", strict: true, schema: quizValidationSchema },
          },
          temperature: 0,
          max_tokens: 6000,
        });

        const valContent = safeJsonParse(valResponse.choices?.[0]?.message?.content, { results: [] } as {
          results: Array<{ question_index: number; approved: boolean; reason: string }>;
        });

        const rejectedIndexes = new Set(
          valContent.results.filter((r) => !r.approved).map((r) => r.question_index)
        );

        approved = candidates.filter((_, i) => !rejectedIndexes.has(i));
      } catch {
        approved = candidates;
      }
    }

    // STEP 5: Regenerate if not enough valid questions
    if (approved.length < 10) {
      const avoidList = approved.map((q) => q.statement);
      try {
        const retryResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: quizPrompt(text, difficulty, avoidList, examType as ExamType | undefined, syllabusContent, topics),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "exam", strict: true, schema: quizSchema },
          },
          temperature: 0.3,
          max_tokens: 12000,
        });

        const retryContent = safeJsonParse(retryResponse.choices?.[0]?.message?.content, { questions: [] } as { questions: QuizQuestion[] });
        for (const q of retryContent.questions) {
          if (approved.length >= 10) break;
          if (validateSyntax(q) && !isCircularQuestion(q)) {
            approved.push(q);
          }
        }
      } catch {
        // Keep what we have
      }
    }

    const finalQuestions = approved.slice(0, 10);

    const quiz = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        title: `Cuestionario - ${difficulty}${examType ? ` (${examType})` : ""}`,
        difficulty,
        examType: examType || null,
        questions: JSON.stringify(finalQuestions),
        total: finalQuestions.length,
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json({
      quizId: quiz.id,
      difficulty,
      questions: finalQuestions.map((q, i) => ({
        number: i + 1,
        statement: q.statement,
        options: q.options,
      })),
    });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el cuestionario. Intentá de nuevo." },
      { status: 502 },
    );
  }
}

// ── PUT: Grade quiz ──

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
      { status: 404 },
    );
  }

  const questions = safeJsonParse(quiz.questions, []) as QuizQuestion[];

  const results = questions.map((q, i) => ({
    number: i + 1,
    statement: q.statement,
    options: q.options,
    selected: answers[i],
    correct_index: q.correct_index,
    correct: answers[i] === q.correct_index,
    explanation: q.explanation,
    source_fragment: q.source_fragment || "",
    concept: q.concept || "",
    option_analyses: q.option_analyses || [],
  }));

  const score = results.filter((r) => r.correct).length;
  const total = questions.length;
  const passed = score >= Math.ceil(total * 0.7);

  const updated = await prisma.quizAttempt.updateMany({
    where: { id: quizId, completedAt: null },
    data: { answers: JSON.stringify(answers), score, passed, completedAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Cuestionario ya entregado" }, { status: 409 });
  }

  addXP(session.user.id, "quiz_complete").catch(() => {});
  if (passed) addXP(session.user.id, "quiz_pass").catch(() => {});
  return NextResponse.json({ score, total, passed, results });
}
