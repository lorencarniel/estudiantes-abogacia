import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH } from "@/lib/ai";
import { mnemonicPrompt, mnemonicSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { text } = body;

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
        { role: "user", content: mnemonicPrompt(text) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "mnemonics", strict: true, schema: mnemonicSchema },
      },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        type: "mnemonic",
        title: result.title || "Mnemotécnicos",
        content: JSON.stringify(result),
        sourceText: text.slice(0, 500),
      },
    });

    addXP(session.user.id, "mnemonic").catch(() => {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("Mnemonic generation error:", err);
    return NextResponse.json({ error: "Error al generar mnemotécnicos. Intentá de nuevo." }, { status: 500 });
  }
}
