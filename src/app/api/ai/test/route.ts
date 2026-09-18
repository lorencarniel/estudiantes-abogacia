import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL } from "@/lib/ai";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "API de IA no configurada" },
      { status: 503 }
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "Sos un asistente de estudio para estudiantes de Abogacía argentinos. Respondé en español.",
        },
        {
          role: "user",
          content: "Respondé con un saludo breve confirmando que la conexión funciona y que estás listo para ayudar a estudiar.",
        },
      ],
      max_tokens: 150,
    });

    return NextResponse.json({
      message: response.choices[0].message.content,
      model: AI_MODEL,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con la IA. Verificá la API key." },
      { status: 502 }
    );
  }
}
