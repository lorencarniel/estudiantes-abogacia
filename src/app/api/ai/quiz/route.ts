import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { quizPrompt, quizSchema, quizValidationPrompt, quizValidationSchema, ExamType } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";
import { safeJsonParse } from "@/lib/utils";

interface QuizQuestion {
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string;
  reference: string;
}

function validateQuestion(q: QuizQuestion): boolean {
  if (!q.statement || q.statement.trim().length < 10) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o) => !o || o.trim().length === 0)) return false;
  if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 3) return false;
  if (!q.explanation || q.explanation.trim().length < 5) return false;
  if (!q.reference || q.reference.trim().length < 5) return false;
  const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
  if (unique.size < 4) return false;
  return true;
}

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
      temperature: 0.3,
      max_tokens: 8000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, { questions: [] } as { questions: QuizQuestion[] });

    let syntaxValid: QuizQuestion[] = [];
    for (const q of content.questions) {
      if (validateQuestion(q)) {
        syntaxValid.push(q);
      }
    }

    // Second pass: semantic validation against the material
    let semanticValid: QuizQuestion[] = [];
    if (syntaxValid.length > 0) {
      try {
        const valResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: "Sos un verificador de calidad de exámenes de derecho argentino. Evaluá cada pregunta con rigor." },
            { role: "user", content: quizValidationPrompt(text, syntaxValid) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "quiz_validation", strict: true, schema: quizValidationSchema },
          },
          temperature: 0,
          max_tokens: 4000,
        });

        const valContent = safeJsonParse(valResponse.choices?.[0]?.message?.content, { results: [] } as {
          results: Array<{ question_index: number; valid: boolean; reason: string }>;
        });

        const invalidIndexes = new Set(
          valContent.results.filter((r) => !r.valid).map((r) => r.question_index)
        );

        semanticValid = syntaxValid.filter((_, i) => !invalidIndexes.has(i));
      } catch {
        semanticValid = syntaxValid;
      }
    }

    // If too many were filtered, regenerate replacements
    if (semanticValid.length < 10) {
      const avoidList = semanticValid.map((q) => q.statement);
      try {
        const retryResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: quizPrompt(text, difficulty, avoidList, examType as ExamType | undefined, syllabusContent) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "exam", strict: true, schema: quizSchema },
          },
          temperature: 0.3,
          max_tokens: 8000,
        });

        const retryContent = safeJsonParse(retryResponse.choices?.[0]?.message?.content, { questions: [] } as { questions: QuizQuestion[] });
        for (const q of retryContent.questions) {
          if (semanticValid.length >= 10) break;
          if (validateQuestion(q)) {
            semanticValid.push(q);
          }
        }
      } catch {
        // Keep what we have
      }
    }

    const finalQuestions = semanticValid.slice(0, 10);

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
      questions: finalQuestions.map(
        (q, i) => ({
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

  const questions = safeJsonParse(quiz.questions, []) as QuizQuestion[];

  const results = questions.map((q, i) => ({
    number: i + 1,
    statement: q.statement,
    options: q.options,
    selected: answers[i],
    correct_index: q.correct_index,
    correct: answers[i] === q.correct_index,
    explanation: q.explanation,
    reference: q.reference || "",
  }));

  const score = results.filter((r) => r.correct).length;
  const passed = score >= 7;

  const updated = await prisma.quizAttempt.updateMany({
    where: { id: quizId, completedAt: null },
    data: { answers: JSON.stringify(answers), score, passed, completedAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Cuestionario ya entregado" }, { status: 409 });
  }

  addXP(session.user.id, "quiz_complete").catch(() => {});
  if (passed) addXP(session.user.id, "quiz_pass").catch(() => {});
  return NextResponse.json({ score, total: 10, passed, results });
}
