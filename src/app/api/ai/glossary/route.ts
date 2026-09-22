import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH, SIMPLE_MODE_SUFFIX } from "@/lib/ai";
import { glossaryPrompt, glossarySchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { text, simpleMode } = body;

  if (!text || text.length < 80) {
    return NextResponse.json({ error: "El texto debe tener al menos 80 caracteres" }, { status: 400 });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: `El texto supera el límite de ${MAX_INPUT_LENGTH.toLocaleString()} caracteres` }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: glossaryPrompt(text) + (simpleMode ? SIMPLE_MODE_SUFFIX : "") },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "glossary", strict: true, schema: glossarySchema },
      },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "glossary",
        title: `Glosario (${result.terms?.length || 0} términos)`,
        content: JSON.stringify(result),
        sourceText: text.slice(0, 500),
      },
    });

    addXP(session.user.id, "glossary").catch(() => {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("Glossary generation error:", err);
    return NextResponse.json({ error: "Error al generar glosario. Intentá de nuevo." }, { status: 500 });
  }
}
