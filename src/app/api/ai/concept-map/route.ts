import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { conceptMapPrompt, conceptMapSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
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

  const { text } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: conceptMapPrompt(text) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "concept_map", strict: true, schema: conceptMapSchema },
      },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = JSON.parse(response.choices[0].message.content || "{}");

    const saved = await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "concept_map",
        title: content.title || "Mapa conceptual",
        content: JSON.stringify(content),
        sourceText: text.substring(0, 500),
      },
    });

    return NextResponse.json({ id: saved.id, ...content });
  } catch (err) {
    console.error("Concept map generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el mapa conceptual. Intentá de nuevo." },
      { status: 502 },
    );
  }
}
