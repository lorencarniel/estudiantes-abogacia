import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const schedules = await prisma.studySchedule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      examDate: s.examDate,
      hoursPerDay: s.hoursPerDay,
      subjects: safeJsonParse(s.subjects, []),
      schedule: safeJsonParse(s.schedule, []),
      completedDays: safeJsonParse(s.completedDays, []),
      createdAt: s.createdAt,
    })),
  });
  } catch (error) {
    console.error("Error al obtener cronogramas:", error);
    return NextResponse.json({ error: "Error al obtener cronogramas" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  await prisma.studySchedule.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar cronograma:", error);
    return NextResponse.json({ error: "Error al eliminar cronograma" }, { status: 500 });
  }
}
