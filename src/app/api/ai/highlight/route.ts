import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH } from "@/lib/ai";
import { highlightPrompt, highlightSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { text } = await request.json();

    if (!text || text.length < 80) {
      return NextResponse.json(
        { error: "El texto debe tener al menos 80 caracteres" },
        { status: 400 }
      );
    }
    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: "El texto supera el límite de caracteres" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: highlightPrompt(text) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: highlightSchema as { name: string; strict: boolean; schema: Record<string, unknown> },
      },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "highlight",
        title: text.substring(0, 60).trim() + "...",
        content: JSON.stringify(result),
        sourceText: text.substring(0, 500),
      },
    });

    await addXP(session.user.id, "highlight");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Highlight error:", error);
    return NextResponse.json(
      { error: "Error al analizar el texto" },
      { status: 502 }
    );
  }
}
