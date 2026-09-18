import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const progressSchema = z.object({
  date: z.string(),
  completed: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const schedule = await prisma.studySchedule.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Cronograma no encontrado" }, { status: 404 });
  }

  const completedDays: string[] = JSON.parse(schedule.completedDays);

  if (parsed.data.completed) {
    if (!completedDays.includes(parsed.data.date)) {
      completedDays.push(parsed.data.date);
    }
  } else {
    const idx = completedDays.indexOf(parsed.data.date);
    if (idx >= 0) completedDays.splice(idx, 1);
  }

  await prisma.studySchedule.update({
    where: { id: params.id },
    data: { completedDays: JSON.stringify(completedDays) },
  });

  return NextResponse.json({ completedDays });
}
