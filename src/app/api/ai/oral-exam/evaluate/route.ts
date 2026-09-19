import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { evaluateAnswerPrompt, evaluateAnswerSchema } from "@/lib/prompts";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { question, keyPoints, studentAnswer, sourceText } = await request.json();

  if (!question || !studentAnswer || !sourceText) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: evaluateAnswerPrompt(question, keyPoints || [], studentAnswer, sourceText) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "evaluate_answer", strict: true, schema: evaluateAnswerSchema },
      },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(content);
  } catch (err) {
    console.error("Evaluate answer error:", err);
    return NextResponse.json({ error: "Error al evaluar la respuesta." }, { status: 502 });
  }
}
