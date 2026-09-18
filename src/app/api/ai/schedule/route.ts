import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { schedulePrompt, scheduleSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";

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

  const exam = new Date(examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (exam <= today) {
    return NextResponse.json({ error: "La fecha del examen debe ser futura" }, { status: 400 });
  }

  const diffDays = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    return NextResponse.json({ error: "Máximo 90 días de planificación" }, { status: 400 });
  }

  const todayStr = today.toISOString().split("T")[0];

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

    const content = JSON.parse(response.choices[0].message.content || "{}");

    const saved = await prisma.studySchedule.create({
      data: {
        userId: session.user.id,
        title: content.title || "Cronograma de estudio",
        examDate: exam,
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
