import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH } from "@/lib/ai";
import {
  triviaGamePrompt,
  triviaGameSchema,
  trueFalseGamePrompt,
  trueFalseGameSchema,
  matchingGamePrompt,
  matchingGameSchema,
  orderingGamePrompt,
  orderingGameSchema,
  fillBlankGamePrompt,
  fillBlankGameSchema,
  ExamType,
} from "@/lib/prompts";

const VALID_GAME_TYPES = ["trivia", "true_false", "matching", "ordering", "fill_blank"] as const;

const GAME_REGISTRY: Record<string, {
  prompt: (text: string, examType?: ExamType, syllabus?: string) => string;
  schema: Record<string, unknown>;
  schemaName: string;
}> = {
  trivia: { prompt: triviaGamePrompt, schema: triviaGameSchema, schemaName: "trivia_game" },
  true_false: { prompt: trueFalseGamePrompt, schema: trueFalseGameSchema, schemaName: "true_false_game" },
  matching: { prompt: matchingGamePrompt, schema: matchingGameSchema, schemaName: "matching_game" },
  ordering: { prompt: orderingGamePrompt, schema: orderingGameSchema, schemaName: "ordering_game" },
  fill_blank: { prompt: fillBlankGamePrompt, schema: fillBlankGameSchema, schemaName: "fill_blank_game" },
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { text, gameType, examType, syllabusId } = body;

  if (!text || text.length < 80) {
    return NextResponse.json(
      { error: "El texto debe tener al menos 80 caracteres" },
      { status: 400 },
    );
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `El texto supera el límite de ${MAX_INPUT_LENGTH.toLocaleString()} caracteres` },
      { status: 400 },
    );
  }

  if (!VALID_GAME_TYPES.includes(gameType)) {
    return NextResponse.json({ error: "Tipo de juego inválido" }, { status: 400 });
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
    const reg = GAME_REGISTRY[gameType];
    const prompt = reg.prompt(text, validExamType, syllabusContent);

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: reg.schemaName,
          strict: true,
          schema: reg.schema,
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const raw = JSON.parse(completion.choices[0].message.content || "{}");

    let questions;
    let total: number;

    if (gameType === "trivia") {
      questions = raw.questions;
      total = questions.length;
    } else if (gameType === "true_false") {
      questions = raw.statements.map(
        (s: { statement: string; is_true: boolean; explanation: string }) => ({
          statement: s.statement,
          options: ["Verdadero", "Falso"],
          correct_index: s.is_true ? 0 : 1,
          explanation: s.explanation,
        }),
      );
      total = questions.length;
    } else if (gameType === "matching") {
      questions = raw.pairs;
      total = raw.pairs.length;
    } else if (gameType === "ordering") {
      questions = raw.items;
      total = raw.items.length;
    } else {
      questions = raw.sentences;
      total = raw.sentences.length;
    }

    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.user.id,
        gameType,
        examType: validExamType || null,
        title: raw.title,
        questions: JSON.stringify(questions),
        total,
      },
    });

    return NextResponse.json({
      id: gameSession.id,
      gameType,
      title: raw.title,
      questions,
      total,
      description: raw.description,
      explanation: raw.explanation,
    });
  } catch (err) {
    console.error("Game generation error:", err);
    return NextResponse.json(
      { error: "Error al generar el juego. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
