import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { schedulePrompt, scheduleSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

const subjectSchema = z.object({
  name: z.string().min(1),
  mastery: z.number().int().min(1).max(5),
});

const requestSchema = z.object({
  subjects: z.array(subjectSchema).min(1).max(20),
  examDate: z.string().min(10),
  hoursPerDay: z.number().min(0.5).max(12),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { subjects, examDate, hoursPerDay } = parsed.data;

  // Parse dates as local noon to avoid UTC/timezone off-by-one
  const [ey, em, ed] = examDate.split("-").map(Number);
  const exam = new Date(ey, em - 1, ed, 12, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

  if (exam <= today) {
    return NextResponse.json({ error: "La fecha del examen debe ser futura" }, { status: 400 });
  }

  const diffDays = Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    return NextResponse.json({ error: "Máximo 90 días de planificación" }, { status: 400 });
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: schedulePrompt(subjects, examDate, hoursPerDay, todayStr) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "study_schedule", strict: true, schema: scheduleSchema },
      },
      temperature: 0.4,
      max_tokens: 8000,
    });

    const content = safeJsonParse(response.choices?.[0]?.message?.content, {} as any);

    const saved = await prisma.studySchedule.create({
      data: {
        userId: session.user.id,
        title: content.title || "Cronograma de estudio",
        examDate: new Date(ey, em - 1, ed, 12, 0, 0),
        hoursPerDay,
        subjects: JSON.stringify(subjects),
        schedule: JSON.stringify(content.days || []),
      },
    });

    return NextResponse.json({ id: saved.id, title: content.title, days: content.days });
  } catch (err) {
    console.error("Schedule generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el cronograma. Intentá de nuevo." },
      { status: 502 },
    );
  }
}
