import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { evaluateCasePrompt, evaluateCaseSchema } from "@/lib/prompts";
import { safeJsonParse } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { caseFacts, caseQuestions, studentAnalysis, resolution, sourceText } = await request.json();

  if (!caseFacts || !studentAnalysis || !sourceText) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: evaluateCasePrompt(caseFacts, caseQuestions || [], studentAnalysis, resolution || "", sourceText) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "evaluate_case", strict: true, schema: evaluateCaseSchema },
      },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);
    return NextResponse.json(content);
  } catch (err) {
    console.error("Evaluate case error:", err);
    return NextResponse.json({ error: "Error al evaluar el análisis." }, { status: 502 });
  }
}
