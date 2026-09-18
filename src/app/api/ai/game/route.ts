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
} from "@/lib/prompts";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { text, gameType } = body;

  if (!text || text.length < 80) {
    return NextResponse.json(
      { error: "El texto debe tener al menos 80 caracteres" },
      { status: 400 }
    );
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `El texto supera el límite de ${MAX_INPUT_LENGTH.toLocaleString()} caracteres` },
      { status: 400 }
    );
  }

  if (!["trivia", "true_false"].includes(gameType)) {
    return NextResponse.json(
      { error: "Tipo de juego inválido" },
      { status: 400 }
    );
  }

  try {
    const isTrivia = gameType === "trivia";
    const prompt = isTrivia
      ? triviaGamePrompt(text)
      : trueFalseGamePrompt(text);
    const schema = isTrivia ? triviaGameSchema : trueFalseGameSchema;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: isTrivia ? "trivia_game" : "true_false_game",
          strict: true,
          schema,
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const raw = JSON.parse(completion.choices[0].message.content || "{}");

    let questions;
    if (isTrivia) {
      questions = raw.questions;
    } else {
      questions = raw.statements.map(
        (s: { statement: string; is_true: boolean; explanation: string }) => ({
          statement: s.statement,
          options: ["Verdadero", "Falso"],
          correct_index: s.is_true ? 0 : 1,
          explanation: s.explanation,
        })
      );
    }

    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.user.id,
        gameType,
        title: raw.title,
        questions: JSON.stringify(questions),
        total: questions.length,
      },
    });

    return NextResponse.json({
      id: gameSession.id,
      gameType,
      title: raw.title,
      questions,
      total: questions.length,
    });
  } catch (err) {
    console.error("Game generation error:", err);
    return NextResponse.json(
      { error: "Error al generar el juego. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
