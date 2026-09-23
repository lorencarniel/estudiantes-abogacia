import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { expandSummaryPrompt, summarySchema } from "@/lib/prompts";
import { safeJsonParse } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, currentSummary, currentConcepts } = await request.json();

  if (!text || !currentSummary) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: expandSummaryPrompt(text, currentSummary, currentConcepts || "") },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "summary", strict: true, schema: summarySchema },
      },
      temperature: 0.4,
      max_tokens: 16000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);
    return NextResponse.json(content);
  } catch (err) {
    console.error("Expand summary error:", err);
    return NextResponse.json({ error: "Error al expandir el resumen." }, { status: 502 });
  }
}
